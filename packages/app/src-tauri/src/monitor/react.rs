//! 事件驱动表情层的探测器：把 provider 活跃状态转换翻译为宠物反应事件。
//! PoC 范围（issue #128）：work_done —— 活跃持续足够久后全部停止，判定"干完活"。

use std::collections::BTreeSet;
use std::time::{Duration, Instant};

/// 活跃持续至少该时长，结束才判定为完成了一次工作
pub const WORK_DONE_MIN_ACTIVE: Duration = Duration::from_secs(30);
/// 同类事件的冷却窗口，避免反复起停刷屏
pub const WORK_DONE_COOLDOWN: Duration = Duration::from_secs(120);

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReactEvent {
    pub event: &'static str,
    pub provider: String,
    pub duration_secs: u64,
}

pub struct ReactDetector {
    active_providers: BTreeSet<String>,
    active_since: Option<Instant>,
    last_emitted: Option<Instant>,
}

impl ReactDetector {
    pub fn new() -> Self {
        Self {
            active_providers: BTreeSet::new(),
            active_since: None,
            last_emitted: None,
        }
    }

    /// 每轮扫描后调用：传入本轮活跃的 provider id 集合，返回应发射的反应事件。
    pub fn observe(&mut self, active: BTreeSet<String>, now: Instant) -> Option<ReactEvent> {
        let was_active = !self.active_providers.is_empty();
        let now_active = !active.is_empty();
        let mut event = None;

        if !was_active && now_active {
            self.active_since = Some(now);
        } else if was_active && !now_active {
            if let Some(since) = self.active_since.take() {
                let duration = now.duration_since(since);
                if duration >= WORK_DONE_MIN_ACTIVE {
                    let cooled_down = self
                        .last_emitted
                        .is_none_or(|t| now.duration_since(t) >= WORK_DONE_COOLDOWN);
                    if cooled_down {
                        // BTreeSet 首元素保证同一活跃集合的事件归属稳定
                        let provider = self
                            .active_providers
                            .iter()
                            .next()
                            .cloned()
                            .unwrap_or_default();
                        event = Some(ReactEvent {
                            event: "work_done",
                            provider,
                            duration_secs: duration.as_secs(),
                        });
                        self.last_emitted = Some(now);
                    }
                }
            }
        }

        self.active_providers = active;
        event
    }
}

impl Default for ReactDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn set(ids: &[&str]) -> BTreeSet<String> {
        ids.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn short_burst_emits_nothing() {
        let mut d = ReactDetector::new();
        let t0 = Instant::now();
        assert!(d.observe(set(&["claude-code"]), t0).is_none());
        // 10 秒后停止：短促起停不算完成工作
        assert!(d.observe(set(&[]), t0 + Duration::from_secs(10)).is_none());
    }

    #[test]
    fn sustained_work_then_stop_emits_work_done() {
        let mut d = ReactDetector::new();
        let t0 = Instant::now();
        d.observe(set(&["claude-code"]), t0);
        d.observe(set(&["claude-code"]), t0 + Duration::from_secs(10));
        let ev = d
            .observe(set(&[]), t0 + Duration::from_secs(45))
            .expect("should emit work_done");
        assert_eq!(ev.event, "work_done");
        assert_eq!(ev.provider, "claude-code");
        assert_eq!(ev.duration_secs, 45);
    }

    #[test]
    fn cooldown_suppresses_repeat() {
        let mut d = ReactDetector::new();
        let t0 = Instant::now();
        d.observe(set(&["opencode"]), t0);
        assert!(d.observe(set(&[]), t0 + Duration::from_secs(60)).is_some());
        // 冷却期内再来一轮同样时长的工作，不重复发射（距上次发射 110s < 120s）
        d.observe(set(&["opencode"]), t0 + Duration::from_secs(100));
        assert!(d.observe(set(&[]), t0 + Duration::from_secs(170)).is_none());
        // 冷却窗口过后恢复发射
        d.observe(set(&["opencode"]), t0 + Duration::from_secs(400));
        assert!(d.observe(set(&[]), t0 + Duration::from_secs(500)).is_some());
    }

    #[test]
    fn multi_provider_attribution_is_stable() {
        let mut d = ReactDetector::new();
        let t0 = Instant::now();
        d.observe(set(&["trae", "claude-code"]), t0);
        let ev = d
            .observe(set(&[]), t0 + Duration::from_secs(40))
            .expect("should emit");
        assert_eq!(ev.provider, "claude-code");
    }

    #[test]
    fn provider_swap_without_gap_keeps_working() {
        let mut d = ReactDetector::new();
        let t0 = Instant::now();
        d.observe(set(&["claude-code"]), t0);
        // 换了个工具接着干（无空档）：不算结束也不重置起始时间
        assert!(d
            .observe(set(&["codex-cli"]), t0 + Duration::from_secs(20))
            .is_none());
        assert!(d.active_since.is_some());
        let ev = d
            .observe(set(&[]), t0 + Duration::from_secs(50))
            .expect("should emit for the whole session");
        assert_eq!(ev.duration_secs, 50);
    }
}
