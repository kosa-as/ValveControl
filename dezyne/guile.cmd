@echo off
setlocal
set LANG=en_US.UTF-8
set dir=%~dp0
set dir=%dir:\=/%
set GUILE_AUTO_COMPILE=0
set GUILE_LOAD_PATH=%GUILE_LOAD_PATH%;%dir%/gnu/share/guile/site/3.0;%dir%/share/guile/3.0
set GUILE_LOAD_COMPILED_PATH=%GUILE_LOAD_COMPILED_PATH%;%dir%/gnu/lib/guile/3.0/site-ccache;%dir%/gnu/lib/guile/3.0/ccache
set GUIX_LOCPATH=%dir%/gnu/lib/locale
set HOME=%USERPROFILE%
set PATH=%dir%;%dir%/gnu/bin;%dir%/gnu/lib;%dir%/gnu/lib/guile/3.0/extensions;%PATH%
guile.exe %*
