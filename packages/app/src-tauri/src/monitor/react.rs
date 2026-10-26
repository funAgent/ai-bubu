//! Edge-triggered reactions layered over the existing movement system (#73 / #128).
//! Activity means distinct active providers, not subagents within a single provider.

use std::collections::BTreeSet;
use std::time::{Duration, Instant};

pub const WORK_DONE_MIN_ACTIVE: Duration = Duration::from_secs(30);
pub const WORK_START_COOLDOWN: Duration = Duration::from_secs(15);
pub const MULTI_TOOL_COOLDOWN: Duration = Duration::from_secs(30);
pub const WORK_DONE_COOLDOWN: Duration = Duration::from_secs(120);

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactEvent {
    pub event: &'static str,
    pub provider: String,
    pub duration_secs: u64,
}

#[derive(Default)]
pub struct ReactDetector {
    active_providers: BTreeSet<String>,
    active_since: Option<Instant>,
    last_start: Option<Instant>,
    last_multi: Option<Instant>,
    last_done: Option<Instant>,
}

impl ReactDetector {
    pub fn new() -> Self {
        Self::default()
    }

    /// At most one reaction per scan. On 0 -> 2+ prefer multi_tool over work_start.
    /// Cooldown-suppressed edges are discarded, never queued for stale playback.
    pub fn observe(&mut self, active: BTreeSet<String>, now: Instant) -> Option<ReactEvent> {
        let was_active = !self.active_providers.is_empty();
        let now_active = !active.is_empty();
        let mut candidate = None;

        if !was_active && now_active {
            self.active_since = Some(now);
        }

        if active.len() >= 2 && self.active_providers.len() < 2 {
            candidate = Some(("multi_tool", &mut self.last_multi, MULTI_TOOL_COOLDOWN));
        } else if !was_active && now_active {
            candidate = Some(("work_start", &mut self.last_start, WORK_START_COOLDOWN));
        } else if was_active && !now_active {
            if let Some(since) = self.active_since {
                if now.duration_since(since) >= WORK_DONE_MIN_ACTIVE {
                    candidate = Some(("work_done", &mut self.last_done, WORK_DONE_COOLDOWN));
                }
            }
        }

        let event = candidate.and_then(|(name, last, cooldown)| {
            if last.is_some_and(|t| now.duration_since(t) < cooldown) {
                return None;
            }
            *last = Some(now);
            // Stable attribution: first currently active provider, or previous set on stop.
            let providers = if now_active {
                &active
            } else {
                &self.active_providers
            };
            Some(ReactEvent {
                event: name,
                provider: providers.iter().next().cloned().unwrap_or_default(),
                duration_secs: self
                    .active_since
                    .map_or(0, |t| now.duration_since(t).as_secs()),
            })
        });

        if !now_active {
            self.active_since = None;
        }
        self.active_providers = active;
        event
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn set(ids: &[&str]) -> BTreeSet<String> {
        ids.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn starts_once_and_short_work_does_not_celebrate() {
        let mut d = ReactDetector::new();
        let t = Instant::now();
        assert!(d.observe(set(&[]), t).is_none());
        let ev = d.observe(set(&["codex-cli"]), t).unwrap();
        assert_eq!(ev.event, "work_start");
        assert_eq!(ev.duration_secs, 0);
        assert!(d
            .observe(set(&["codex-cli"]), t + Duration::from_secs(1))
            .is_none());
        assert!(d.observe(set(&[]), t + Duration::from_secs(10)).is_none());
    }

    #[test]
    fn bridge_payload_retains_camel_case_contract() {
        let mut d = ReactDetector::new();
        let ev = d.observe(set(&["codex-cli"]), Instant::now()).unwrap();
        assert_eq!(
            serde_json::to_value(ev).unwrap(),
            serde_json::json!({ "event": "work_start", "provider": "codex-cli", "durationSecs": 0 })
        );
    }

    #[test]
    fn concurrent_start_prefers_multi_and_uses_stable_attribution() {
        let mut d = ReactDetector::new();
        let t = Instant::now();
        let ev = d.observe(set(&["trae", "claude-code"]), t).unwrap();
        assert_eq!(ev.event, "multi_tool");
        assert_eq!(ev.provider, "claude-code");
        assert!(d
            .observe(
                set(&["trae", "claude-code", "codex-cli"]),
                t + Duration::from_secs(1)
            )
            .is_none());
    }

    #[test]
    fn threshold_crossing_not_provider_identity_triggers_multi() {
        let mut d = ReactDetector::new();
        let t = Instant::now();
        d.observe(set(&["claude-code"]), t);
        assert!(d
            .observe(set(&["codex-cli"]), t + Duration::from_secs(1))
            .is_none());
        let ev = d
            .observe(
                set(&["claude-code", "codex-cli"]),
                t + Duration::from_secs(2),
            )
            .unwrap();
        assert_eq!(ev.event, "multi_tool");
        assert_eq!(ev.duration_secs, 2);
        assert!(d
            .observe(set(&["trae", "codex-cli"]), t + Duration::from_secs(3))
            .is_none());
    }

    #[test]
    fn multi_cooldown_discards_edges_and_requires_a_new_crossing() {
        let mut d = ReactDetector::new();
        let t = Instant::now();
        d.observe(set(&["a", "b"]), t);
        d.observe(set(&["a"]), t + Duration::from_secs(1));
        assert!(d
            .observe(set(&["a", "b"]), t + Duration::from_secs(29))
            .is_none());
        assert!(d
            .observe(set(&["a", "b"]), t + Duration::from_secs(30))
            .is_none());
        d.observe(set(&["a"]), t + Duration::from_secs(31));
        assert_eq!(
            d.observe(set(&["a", "b"]), t + Duration::from_secs(32))
                .unwrap()
                .event,
            "multi_tool"
        );
    }

    #[test]
    fn start_cooldown_boundary() {
        let mut d = ReactDetector::new();
        let t = Instant::now();
        d.observe(set(&["a"]), t);
        d.observe(set(&[]), t + Duration::from_secs(1));
        assert!(d
            .observe(set(&["a"]), t + Duration::from_secs(14))
            .is_none());
        d.observe(set(&[]), t + Duration::from_secs(14));
        assert_eq!(
            d.observe(set(&["a"]), t + Duration::from_secs(15))
                .unwrap()
                .event,
            "work_start"
        );
    }

    #[test]
    fn completion_waits_for_all_providers_and_keeps_session_duration() {
        let mut d = ReactDetector::new();
        let t = Instant::now();
        d.observe(set(&["a"]), t);
        d.observe(set(&["a", "b"]), t + Duration::from_secs(10));
        assert!(d
            .observe(set(&["b"]), t + Duration::from_secs(20))
            .is_none());
        let ev = d.observe(set(&[]), t + WORK_DONE_MIN_ACTIVE).unwrap();
        assert_eq!(ev.event, "work_done");
        assert_eq!(ev.duration_secs, 30);
        assert_eq!(ev.provider, "b");
        assert!(d.active_since.is_none());
        assert!(d.observe(set(&[]), t + Duration::from_secs(31)).is_none());
    }

    #[test]
    fn cooldowns_are_independent_and_completion_retains_120s_boundary() {
        let mut d = ReactDetector::new();
        let t = Instant::now();
        d.observe(set(&["a"]), t);
        assert_eq!(
            d.observe(set(&[]), t + Duration::from_secs(30))
                .unwrap()
                .event,
            "work_done"
        );
        assert_eq!(
            d.observe(set(&["a"]), t + Duration::from_secs(31))
                .unwrap()
                .event,
            "work_start"
        );
        assert_eq!(
            d.observe(set(&["a", "b"]), t + Duration::from_secs(32))
                .unwrap()
                .event,
            "multi_tool"
        );
        assert!(d.observe(set(&[]), t + Duration::from_secs(61)).is_none());
        d.observe(set(&["b"]), t + Duration::from_secs(120));
        assert_eq!(
            d.observe(set(&[]), t + Duration::from_secs(150))
                .unwrap()
                .event,
            "work_done"
        );
    }
}
