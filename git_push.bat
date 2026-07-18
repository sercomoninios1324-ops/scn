@echo off
set GIT=C:\Program Files\Git\cmd\git.exe

echo === Git Status ===
"%GIT%" status

echo === Git Add ===
"%GIT%" add .

echo === Git Commit ===
"%GIT%" commit -m "update: remove admin demo credentials and change phone number to 2915224734"

echo === Git Push ===
"%GIT%" push -u origin main

echo === DONE ===
