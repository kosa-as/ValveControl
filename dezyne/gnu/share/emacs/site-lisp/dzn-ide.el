;;; Verum-Dezyne --- An IDE for Dezyne
;;;
;;; Copyright © 2020, 2022 Jan (janneke) Nieuwenhuizen <janneke@gnu.org>
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

(require 'compile)
(require 'easymenu)
(require 'json)
(require 'websocket nil t)

(defconst dzn-windows-p (eq system-type 'windows-nt)
  "Is Emacs running on Windows?")

(defun PATH-search-path (file-name)
  (locate-file file-name (split-string (getenv "PATH") ":") nil 'executable))

(defcustom dzn-ide-program
  (if (or (PATH-search-path "ide")
          (not load-file-name) dzn-windows-p) "ide"
    (let* ((dir (file-name-directory load-file-name))
           (pre-inst-env (concat dir "../pre-inst-env")))
      (if (file-exists-p pre-inst-env) (concat pre-inst-env " ide")
        (concat dir "../bin/ide"))))
  "ide command.")

(defcustom dzn-daemon-p t
  "Use dzn daemon?")

(defcustom dzn-editor-port 3003
  "The daemon port to connect to.")

(defvar dzn-websocket-client nil
  "Server.")

(defvar dzn-browsers ()
  "List of connected browsers.")

(defun dzn-ide-hello-p ()
  (and dzn-ide-program
       (dzn-command-p (concat dzn-program " hello"))))

(defun dzn-ide-hello ()
  (interactive)
  (setq dzn-ticket (dzn-hello-p)))

(defun dzn-ide-command (name options &optional buffer input)
  (dzn-compile (dzn-ide-command-string name options) buffer input))

(defun dzn-ide-command-list (name &optional options)
  (let* ((simple-p (member name '("browse" "hello" "info")))
         (file (if simple-p ""
                 (buffer-file-name)))
         (includes (if simple-p nil
                     (mapcar (lambda (x) (concat "-I " x)) dzn-include-dirs))))
    `(,dzn-ide-program ,name
                       ,@includes ,@options ,file)))

(defun dzn-ide-command-string (name &optional options)
  (mapconcat 'identity (dzn-ide-command-list name options) " "))

(defun dzn-ide-verify-p ()
  (and dzn-ide-program
       (dzn-command-p (concat dzn-ide-program " verify --help"))))

(defun dzn-ide-system-p ()
  (and dzn-ide-program
       (dzn-command-p (concat dzn-ide-program " system --help"))))

(defun assoc-ref (alist key &optional default)
  (let ((value (assoc-string key alist)))
    (if value (cdr value)
      default)))

(defun dzn-connect ()
  (interactive)
  (if dzn-websocket-client
      (message "Verum-Dezyne already connected")
    (message "Verum-Dezyne connecting: %s" dzn-editor-port)
    (let ((uri (format "ws://localhost:%s" dzn-editor-port)))
      (setq dzn-websocket-client
            (websocket-open
             uri
             :on-open (lambda (ws)
                        (message ":ON-OPEN!"))

             :on-message (lambda (ws frame)
                           (message ":ON-MESSAGE!")
                           (when frame
                             (let* ((msg (websocket-frame-payload frame))
                                    (foo (message "on-message: msg=%s" (substring msg 0 (min 60 (length msg)))))
                                    (data (append (json-read-from-string msg) nil))
                                    (location (assoc-ref data 'go_to)))
                               (and location
                                    (dzn-goto-location location)))))

             :on-close (lambda (ws)
                         (message ":ON-CLOSE")
                         (setq dzn-websocket-client nil))

             :on-error (lambda (ws type err)
                         (message ":ON-ERROR" ws)
                         (message "ERROR: type:%s, err:%s" type err)))))))

(defun dzn-disconnect ()
  (interactive)
  (when dzn-websocket-client
    (message "Verum-Dezyne stopping")
    (websocket-close dzn-websocket-client)
    (setq dzn-websocket-client nil)))

(setq dzn-mode-debug-p t)
(defun dzn-goto-location (location)
  (message "location %S" location)
  (when (assoc-ref location 'file-name)
    (with-temp-buffer
      (let* ((save-selected (selected-window))
             (file-name (assoc-ref location 'file-name "*scratch*"))
             (line (assoc-ref location 'line 0))
             (column (assoc-ref location 'column 0))
             (focus-p (assoc-ref location 'focus nil))
             (id (assoc-ref location 'index nil))
             (end-line (assoc-ref location 'end-line nil))
             (end-column (assoc-ref location 'end-column nil)))
        (when dzn-mode-debug-p
          (message "file-name %s [%s]" file-name (type-of file-name))
          (message "line %s [%s]" line (type-of line))
          (message "column %s [%s]" column (type-of column))
          (message "focus-p %s [%s]" focus-p (type-of focus-p))
          (if (and (= line 0) (not (= offset 0)))
              (message "%s:@%s" file-name offset)
            (message "%s:%s:%s" file-name line column)))
        (if (not (file-exists-p file-name))
            (message "no such file: %s" file-name)
          (if (find-buffer-visiting file-name)
              (pop-to-buffer (find-buffer-visiting file-name))
            (find-file file-name))
          (when (and end-line (mark))
            (setq mark-active end-line))
          (when end-line
            (goto-char 0)
            (goto-line end-line)
            (forward-char (1- end-column))
            (push-mark nil t))
          (goto-char 0)
          (if (and (= line 0) (not (= offset 0)))
              (goto-char (1+ offset))
            (forward-line (1- line))
            (forward-char (1- column)))
          (if focus-p
            (select-frame-set-input-focus (car (frame-list)))
            (select-window save-selected)))))))

(defun dzn-follow-view ()
  (dzn-update))

(defvar dzn-last-buffer (current-buffer)
  "Most recent DZN buffer")

(defun dzn-buffer-link-view ()
  (let ((buffer (current-buffer)))
    (when (and dzn-ticket
               (eq major-mode 'dzn-mode)
               (file-exists-p (buffer-file-name)))
      ;; FIXME: add as registered-hook?
      (unless (equal buffer dzn-last-buffer)
        (setq dzn-last-buffer buffer)
        (dzn-follow-view)))))

(defun dzn-link (&optional add-p)
  "Update views when switching buffers.
Toggle on/off: M-x dzn-save RET."
  (interactive)
  (let ((active-p (member 'dzn-buffer-link-view post-command-hook)))
    (if (and active-p (not add-p))
        (remove-hook 'post-command-hook 'dzn-buffer-link-view t)
      (add-hook 'post-command-hook 'dzn-buffer-link-view t t))))

(defun dzn-browse (&optional url-or-prefix)
  (interactive "P")
  (let* ((prefix-p (equal url-or-prefix '(4)))
         (url (and (not prefix-p)
                   url-or-prefix)))
    (if prefix-p (switch-to-buffer-other-window nil))
    (when (or (not dzn-browsers) (called-interactively-p t))
      (shell-command (dzn-ide-command-string "browse" (if url `(,url) '()))))))

(defun dzn-handle-trace (buffer msg)
  (when (equal (buffer-name buffer) "*dzn-compilation*")
    (dzn-browse "trace")
    (let* ((success-p (string= msg "finished\n"))
           (fail-p
            (with-current-buffer buffer
              (save-excursion
                (and (goto-char (point-min))
                     (search-forward-regexp "\nverify:[^\n]*: fail" nil t)
                     (goto-char (point-min))))))
           (verify-p
            (with-current-buffer buffer
              (save-excursion
                (goto-char (point-min))
                (search-forward-regexp "[\n|/]dzn[^\n]*verify" nil t)))))
      (message "result: success-p=%s, fail-p=%s" success-p fail-p))))

(defun dzn-view ()
  (interactive)
  (if (not (member 'dzn-handle-parse compilation-finish-functions))
      (push 'dzn-handle-parse compilation-finish-functions))
  (when (dzn-ide-system-p)
    (dzn-ide-command "system" '() (get-buffer-create "*dzn-compile-system*"))))

(defun dzn-update ()
  (interactive)
  (setq dzn-models nil)
  (dzn-browse)
  (setq dzn-master-buffer (current-buffer))
  (dzn-view))

(defun dzn-ide-verify (model)
  (setq dzn-indexes nil)
  (setq dzn-eligible nil)
  (interactive (list (let ((prompt (format "model: ")))
                       (completing-read prompt
                                        (cons "" (or dzn-models (dzn-get-models)))
                                        nil t nil
                                        'dzn-model
                                        dzn-guess-model))))
  (let* ((model-option (if (and (stringp model)
                                (not (string= model "")))
                           (concat " --model=" model) "")))
    (if (dzn-ide-verify-p) (dzn-ide-command "verify" (list model-option))
      (dzn-command "--verbose verify" (list model-option)))
    (setq compilation-finish-functions '())
    (if (and dzn-daemon-p
             (not (member 'dzn-handle-trace compilation-finish-functions)))
        (push 'dzn-handle-trace compilation-finish-functions))))

(defvar dzn-ide-map ()
  "Keymap used in `dzn-ide' buffers.")

(setq dzn-ide-map nil)
(if dzn-ide-map ()
  (setq dzn-ide-map (make-sparse-keymap))
  (define-key dzn-ide-map "\C-c\C-u" 'dzn-update)
  (define-key dzn-mode-map "\C-c\C-v" 'dzn-ide-verify)
  (setq dzn-mode-map
        (keymap--merge-bindings dzn-mode-map dzn-ide-map)))

(easy-menu-add-item dzn-mode-map '(menu-bar "Dezyne") ["Update views" dzn-ide-update t])
(easy-menu-add-item dzn-mode-map '(menu-bar "Dezyne") ["Verify" dzn-ide-verify t])

;;;###autoload
(defun dzn-ide ()
  "Setup for Verum-Dezyne
"
  (interactive)
  ;; XXX Demo of linking view is nice; but obnoxious in use
  ;; Better: C-c C-u
  ;; (dzn-link t)

  (dzn-ide-hello)
  (when (require 'company nil t)
    (local-set-key (kbd "s-/") 'company-complete)
    (define-key company-active-map (kbd "C-n")
      'company-select-next-or-abort)
    (define-key company-active-map (kbd "C-p")
      'company-select-previous-or-abort))

  (unless dzn-websocket-client
    (dzn-connect)))

(add-hook 'dzn-mode-hook 'dzn-ide)

(provide 'dzn-ide)
;;; dzn-ide.el ends here
