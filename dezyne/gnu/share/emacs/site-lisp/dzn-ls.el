;;; Verum-Dezyne --- An IDE for Dezyne
;;;
;;; Copyright © 2020 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
;;;
;;; This file is part of Verum-Dezyne.
;;;
;;; Verum-Dezyne is property of Verum Software Tools BV <support@verum.com>.
;;; All rights reserved.

;;; Commentary:

;; Installation
;;
;; * Install the websocket package
;;
;;   select: Options/Manage Emacs Packages, or M-x list-packages
;;
;; * Optionally, install the lsp-mode package
;;
;;   select: Options/Manage Emacs Packages, or M-x list-packages
;;
;; * Add to your ~/.config/emacs/init.el
;;
;;   (when (require 'dzn-mode nil t)
;;     (push '("\\.dzn\\'" . dzn-mode) auto-mode-alist))
;;
;; * Evaluate ~/.config/emacs/init.el or restart Emacs

;;; Code:

(require 'dzn-ide) ;for ide-program, see also pre-inst-env.el
(require 'lsp-mode)

;; FIXME: before require'ing LSP??
(setq lsp-keymap-prefix "C-l")
(setq lsp-log-io t)
(setq lsp-print-io t)

(defcustom lsp-clients-dzn-server-command `(,@(split-string ide-program " ") "lsp")
  "Command to start dzn lsp.")

(lsp-register-client
 (make-lsp-client :new-connection
		  (lsp-stdio-connection
                   (lambda () lsp-clients-dzn-server-command))
                  :major-modes '(dzn-mode)
                  :priority -1
                  :server-id 'dzn-ls))

(add-hook 'dzn-mode-hook #'lsp-deferred)
(add-to-list 'lsp-language-id-configuration '(dzn-mode . "Dezyne"))

(provide 'dzn-ls)
;;; dzn-ls.el ends here
