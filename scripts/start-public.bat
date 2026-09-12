@echo off
REM ============================================================
REM  一键启动本地服务 + 公网隧道（localhost.run，免费 SSH 隧道）
REM  双击运行，或在项目目录下执行 scripts\start-public.bat
REM ============================================================
chcp 65001 >nul
cd /d "%~dp0\.."

echo [1/2] 启动 Node.js 服务（端口 3000）...
start "psychological-assessment-server" cmd /k "node server.js"

echo 等待服务启动...
timeout /t 4 /nobreak >nul

echo [2/2] 建立公网隧道（localhost.run，免费 SSH 隧道）...
echo.
echo ============================================================
echo  公网访问链接将显示在下方 "tunneled with tls termination, https://..." 之后
echo.
echo  保持此窗口开启，关闭则公网链接失效。
echo  若提示容量已满或连接被拒，请稍候重试或换用其他隧道服务。
echo ============================================================
echo.
ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=20 -o UserKnownHostsFile=/dev/null -R 80:localhost:3000 nokey@localhost.run

pause
