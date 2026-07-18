@echo off
set GIT=C:\Program Files\Git\cmd\git.exe

echo === Git Status ===
"%GIT%" status

echo === Git Add ===
"%GIT%" add .

echo === Git Commit ===
"%GIT%" commit -m "feat: integrate Supabase backend for categories, products, settings, and storage uploads"

echo === Git Push ===
"%GIT%" push -u origin main

echo === DONE ===
