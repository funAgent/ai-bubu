use crate::monitor::adapter::{ActivityLevel, ProbeResult};
use std::collections::HashSet;
use std::time::Instant;

const RUN_THRESHOLD_S: u64 = 60;
const SPRINT_THRESHOLD_S: u64 = 180;

#[derive(Debug, Clone, Copy)]
pub struct ScoredOutput {
    pub score: f32,
    pub movement: Movement,
    pub active_tool_count: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Movement {
    Sprint,
    Run,
    Walk,
    Idle,
}

impl Movement {
    pub fn as_str(&self) -> &'static str {
        match self {
            Movement::Sprint => "sprint",
            Movement::Run => "run",
            Movement::Walk => "walk",
            Movement::Idle => "idle",
        }
    }
}

/// Determines whether a probe result counts as "real" AI activity.
/// Both primary and fallback adapters require at least ActiveMedium so
/// that the tail-end decay (ActiveLow, 31-60s after last interaction)
/// no longer keeps the state machine timer running.
fn is_real_activity(r: &ProbeResult) -> bool {
    r.activity >= ActivityLevel::ActiveMedium
}

/// Count unique active tools, deduplicating fallback adapters by base provider ID.
/// e.g. "cursor" (primary) + "cursor-process" (fallback) = 1 tool, not 2.
fn count_unique_active_tools(results: &[ProbeResult]) -> usize {
    let mut seen = HashSet::new();
    for r in results {
        if !is_real_activity(r) {
            continue;
        }
        let base_id = r
            .provider_id
            .strip_suffix("-process")
            .unwrap_or(&r.provider_id);
        seen.insert(base_id.to_string());
    }
    seen.len()
}

pub struct MovementStateMachine {
    active_since: Option<Instant>,
}

impl MovementStateMachine {
    pub fn new() -> Self {
        Self { active_since: None }
    }

    pub fn update(&mut self, results: &[ProbeResult]) -> ScoredOutput {
        let active_tool_count = count_unique_active_tools(results);
        let has_activity = active_tool_count > 0;

        if !has_activity {
            self.active_since = None;
            return ScoredOutput {
                score: 0.0,
                movement: Movement::Idle,
                active_tool_count: 0,
            };
        }

        let now = Instant::now();
        if self.active_since.is_none() {
            self.active_since = Some(now);
        }

        let raw_duration_s = now.duration_since(self.active_since.unwrap()).as_secs();

        let speed_multiplier: f64 = if active_tool_count >= 3 {
            2.5
        } else if active_tool_count >= 2 {
            1.8
        } else {
            1.0
        };
        let effective_s = (raw_duration_s as f64 * speed_multiplier) as u64;

        let (movement, score) = if effective_s >= SPRINT_THRESHOLD_S {
            let extra = (effective_s - SPRINT_THRESHOLD_S).min(120) as f32;
            (Movement::Sprint, 75.0 + (extra / 120.0) * 25.0)
        } else if effective_s >= RUN_THRESHOLD_S {
            let progress = (effective_s - RUN_THRESHOLD_S) as f32
                / (SPRINT_THRESHOLD_S - RUN_THRESHOLD_S) as f32;
            (Movement::Run, 50.0 + progress * 24.0)
        } else {
            let progress = effective_s as f32 / RUN_THRESHOLD_S as f32;
            (Movement::Walk, 25.0 + progress * 24.0)
        };

        ScoredOutput {
            score: score.min(100.0),
            movement,
            active_tool_count,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_result(activity: ActivityLevel, fallback: bool) -> ProbeResult {
        make_result_with_id("test", activity, fallback)
    }

    fn make_result_with_id(id: &str, activity: ActivityLevel, fallback: bool) -> ProbeResult {
        ProbeResult {
            provider_id: id.into(),
            provider_name: id.into(),
            activity,
            last_active_ts: Some(0),
            lines_added: None,
            files_changed: None,
            model_name: None,
            is_fallback: fallback,
        }
    }

    #[test]
    fn no_results_gives_idle() {
        let mut sm = MovementStateMachine::new();
        let out = sm.update(&[]);
        assert_eq!(out.movement, Movement::Idle);
        assert_eq!(out.score, 0.0);
    }

    #[test]
    fn all_inactive_gives_idle() {
        let mut sm = MovementStateMachine::new();
        let r = make_result(ActivityLevel::Inactive, false);
        let out = sm.update(&[r]);
        assert_eq!(out.movement, Movement::Idle);
    }

    #[test]
    fn fallback_low_cpu_does_not_count() {
        let mut sm = MovementStateMachine::new();
        let r = make_result(ActivityLevel::ActiveLow, true);
        let out = sm.update(&[r]);
        assert_eq!(out.movement, Movement::Idle);
    }

    #[test]
    fn fallback_medium_cpu_counts() {
        let mut sm = MovementStateMachine::new();
        let r = make_result(ActivityLevel::ActiveMedium, true);
        let out = sm.update(&[r]);
        assert_eq!(out.movement, Movement::Walk);
    }

    #[test]
    fn primary_active_low_gives_idle() {
        let mut sm = MovementStateMachine::new();
        let r = make_result(ActivityLevel::ActiveLow, false);
        let out = sm.update(&[r]);
        assert_eq!(out.movement, Movement::Idle);
    }

    #[test]
    fn activity_stops_resets_to_idle() {
        let mut sm = MovementStateMachine::new();
        let active = make_result(ActivityLevel::ActiveHigh, false);
        sm.update(&[active]);
        assert!(sm.active_since.is_some());

        let inactive = make_result(ActivityLevel::Inactive, false);
        let out = sm.update(&[inactive]);
        assert_eq!(out.movement, Movement::Idle);
        assert!(sm.active_since.is_none());
    }

    #[test]
    fn multi_tool_speeds_up_progression() {
        let mut sm1 = MovementStateMachine::new();
        let mut sm2 = MovementStateMachine::new();

        let one_tool = [make_result_with_id(
            "cursor",
            ActivityLevel::ActiveHigh,
            false,
        )];
        let two_tools = [
            make_result_with_id("cursor", ActivityLevel::ActiveHigh, false),
            make_result_with_id("claude-code", ActivityLevel::ActiveMedium, false),
        ];

        let out1 = sm1.update(&one_tool);
        let out2 = sm2.update(&two_tools);

        assert_eq!(out2.active_tool_count, 2);
        assert!(out2.active_tool_count > out1.active_tool_count);
    }

    #[test]
    fn fallback_same_provider_does_not_double_count() {
        let primary = make_result_with_id("cursor", ActivityLevel::ActiveHigh, false);
        let fallback = ProbeResult {
            provider_id: "cursor-process".into(),
            provider_name: "Cursor (process)".into(),
            activity: ActivityLevel::ActiveMedium,
            is_fallback: true,
            ..primary.clone()
        };

        let count = count_unique_active_tools(&[primary, fallback]);
        assert_eq!(count, 1, "primary + its fallback should count as 1 tool");
    }

    #[test]
    fn different_providers_count_separately() {
        let cursor = make_result_with_id("cursor", ActivityLevel::ActiveHigh, false);
        let claude = make_result_with_id("claude-code", ActivityLevel::ActiveMedium, false);
        let count = count_unique_active_tools(&[cursor, claude]);
        assert_eq!(count, 2);
    }

    #[test]
    fn score_capped_at_100() {
        let mut sm = MovementStateMachine::new();
        sm.active_since = Some(Instant::now() - std::time::Duration::from_secs(600));
        let r = make_result(ActivityLevel::ActiveHigh, false);
        let out = sm.update(&[r]);
        assert!(out.score <= 100.0);
    }

    #[test]
    fn movement_str() {
        assert_eq!(Movement::Sprint.as_str(), "sprint");
        assert_eq!(Movement::Run.as_str(), "run");
        assert_eq!(Movement::Walk.as_str(), "walk");
        assert_eq!(Movement::Idle.as_str(), "idle");
    }

    #[test]
    fn progression_walk_to_run() {
        let mut sm = MovementStateMachine::new();
        sm.active_since = Some(Instant::now() - std::time::Duration::from_secs(65));
        let r = make_result(ActivityLevel::ActiveHigh, false);
        let out = sm.update(&[r]);
        assert_eq!(out.movement, Movement::Run);
        assert!(out.score >= 50.0 && out.score < 75.0);
    }

    #[test]
    fn progression_run_to_sprint() {
        let mut sm = MovementStateMachine::new();
        sm.active_since = Some(Instant::now() - std::time::Duration::from_secs(200));
        let r = make_result(ActivityLevel::ActiveHigh, false);
        let out = sm.update(&[r]);
        assert_eq!(out.movement, Movement::Sprint);
        assert!(out.score >= 75.0);
    }
}
