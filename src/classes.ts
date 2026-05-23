// Public CSS contract. Any change here is a breaking change for downstream stylesheets.

// IDs (unique elements).
export const ID_MODAL = 'statique-pouet-modal';
export const ID_MODAL_INPUT = 'statique-pouet-modal-input';
/** <datalist> linked to the modal input via list=… */
export const ID_MODAL_SUGGESTIONS = 'statique-pouet-modal-suggestions';

// Comments tree.
export const CLS_COMMENTS_LIST = 'statique-pouet-comments-list';
export const CLS_COMMENT = 'statique-pouet-comment';
export const CLS_COMMENT_HEADER = 'statique-pouet-comment-header';
export const CLS_COMMENT_REPLIES = 'statique-pouet-comment-replies';
export const CLS_AVATAR = 'statique-pouet-avatar';
export const CLS_AUTHOR = 'statique-pouet-author';
export const CLS_AUTHOR_LINK = 'statique-pouet-author-link';
export const CLS_HANDLE = 'statique-pouet-handle';
export const CLS_DATE = 'statique-pouet-date';
export const CLS_CONTENT = 'statique-pouet-content';
export const CLS_ACTIONS = 'statique-pouet-actions';
export const CLS_ACTION_REPLY = 'statique-pouet-action-reply';
export const CLS_ACTION_VIEW = 'statique-pouet-action-view';

// Alerts.
export const CLS_ALERT = 'statique-pouet-alert';
export const CLS_ALERT_ERROR = 'statique-pouet-alert-error';
export const CLS_ALERT_INFO = 'statique-pouet-alert-info';
export const CLS_ERROR = 'statique-pouet-error';
export const CLS_LOADING = 'statique-pouet-loading';
export const CLS_EMPTY = 'statique-pouet-empty';

// Modal internals. Every element carries its own class so the host
// stylesheet never needs a descendant selector.
export const CLS_MODAL_CONTENT = 'statique-pouet-modal-content';
export const CLS_MODAL_TITLE = 'statique-pouet-modal-title';
export const CLS_MODAL_DESCRIPTION = 'statique-pouet-modal-description';
export const CLS_MODAL_FORM = 'statique-pouet-modal-form';
export const CLS_MODAL_LABEL = 'statique-pouet-modal-label';
export const CLS_MODAL_BUTTONS = 'statique-pouet-modal-buttons';
export const CLS_MODAL_CANCEL = 'statique-pouet-modal-cancel';
export const CLS_MODAL_SUBMIT = 'statique-pouet-modal-submit';
