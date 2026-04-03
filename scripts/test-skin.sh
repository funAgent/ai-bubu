#!/bin/bash
# 皮肤测试模式
# 启动开发服务器后，在宠物窗口按 T 键打开 Skin Tester 面板
#
# 功能：
#   - 同时展示 4 种运动状态（sprint/run/walk/idle）
#   - 切换不同皮肤
#
# 用法：
#   ./scripts/test-skin.sh          # 启动开发服务器，然后按 T 打开测试面板
#   ./scripts/test-skin.sh doux     # 启动并指定测试的皮肤 ID
#
# 添加新皮肤后测试流程：
#   1. 将皮肤资源放到 public/skins/<skin-id>/
#   2. 编写 skin.json 清单文件（或用 scripts/build-skin.py 生成）
#   3. 运行 ./scripts/test-skin.sh
#   4. 按 T 打开测试面板，切换到新皮肤
#   5. 检查每个状态的动画效果

cd "$(dirname "$0")/.." || exit 1

SKIN_ID="${1:-}"

if [ -n "$SKIN_ID" ]; then
  SKIN_DIR="public/skins/$SKIN_ID"
  if [ ! -d "$SKIN_DIR" ]; then
    echo "错误: 找不到皮肤目录 $SKIN_DIR"
    echo "可用的皮肤:"
    ls -1 public/skins/ 2>/dev/null || echo "  (无)"
    exit 1
  fi
  if [ ! -f "$SKIN_DIR/skin.json" ]; then
    echo "错误: 找不到 $SKIN_DIR/skin.json"
    exit 1
  fi
  echo "测试皮肤: $SKIN_ID"
  echo "skin.json 内容:"
  cat "$SKIN_DIR/skin.json"
  echo ""
fi

echo "========================================="
echo "  AI 步步 Skin Tester"
echo "========================================="
echo ""
echo "启动后在宠物窗口按 T 键打开测试面板"
echo "面板功能："
echo "  - 同时展示 4 种运动状态"
echo "  - 切换皮肤"
echo ""
echo "可用皮肤:"
for dir in public/skins/*/; do
  name=$(basename "$dir")
  if [ -f "$dir/skin.json" ]; then
    echo "  - $name"
  fi
done
echo ""

pnpm tauri dev
