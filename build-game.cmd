@echo off
chcp 65001 >nul
cd /d %~dp0
echo 正在构建游戏，请稍候...
call npm run build || (echo 构建失败，请确认已安装依赖(node_modules) & pause & exit /b 1)
echo 构建完成，正在启动...
node serve-dist.mjs
pause
