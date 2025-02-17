@echo off
setlocal
set dir=%~dp0
set dir=%dir:\=/%
set DZN_DATADIR=%dir%/gnu/share/dezyne
set IDE_DATADIR=%dir%/gnu/share/verum-dezyne
set HOME=%USERPROFILE:\=/%
set XDG_CACHE_HOME=%LOCALAPPDATA:\=/%
set XDG_RUNTIME_DIR=%XDG_CACHE_HOME%
"%dir%/guile.cmd" "%dir%/gnu/bin/dzn" %*
