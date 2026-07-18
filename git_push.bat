@echo off
set GIT="C:\Program Files\Git\cmd\git.exe"

echo === git init ===
%GIT% init

echo === git add all ===
%GIT% add .

echo === git commit ===
%GIT% commit -m "first commit"

echo === git branch -M main ===
%GIT% branch -M main

echo === git remote add origin ===
%GIT% remote remove origin 2>nul
%GIT% remote add origin https://github.com/sercomoninios1324-ops/scn.git

echo === git push ===
%GIT% push -u origin main

echo === DONE ===
