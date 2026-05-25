// DOM rendering for comments, alerts, and the content-replacement helper.
import type { MastodonStatus, TreeNode } from './types.js';
import {
  CLS_ALERT,
  CLS_ALERT_ERROR,
  CLS_ALERT_INFO,
  CLS_ERROR,
  CLS_LOADING,
  CLS_EMPTY,
  CLS_COMMENTS_LIST,
  CLS_COMMENT,
  CLS_COMMENT_HEADER,
  CLS_COMMENT_REPLIES,
  CLS_AVATAR,
  CLS_AUTHOR,
  CLS_AUTHOR_LINK,
  CLS_HANDLE,
  CLS_DATE,
  CLS_CONTENT,
  CLS_ACTIONS,
  CLS_ACTION_REPLY,
  CLS_ACTION_VIEW,
} from './classes.js';
import { sanitizeHtml } from './sanitize.js';
import { formatRelativeDate } from './date.js';
import { t } from './state.js';

/** Replace the entire content of `container` with the result of `renderFn`. */
export function replaceContent<A extends unknown[]>(
  container: HTMLElement,
  renderFn: (c: HTMLElement, ...args: A) => void,
  ...args: A
): void {
  container.innerHTML = '';
  renderFn(container, ...args);
}

/** Common base + type variant + semantic class for fine-grained targeting. */
function renderAlert(
  container: HTMLElement,
  variantClass: string,
  semanticClass: string,
  message: string,
): void {
  const p = document.createElement('p');
  p.className = `${CLS_ALERT} ${variantClass} ${semanticClass}`;
  p.textContent = message;
  container.appendChild(p);
}

export function renderError(container: HTMLElement, message: string): void {
  renderAlert(container, CLS_ALERT_ERROR, CLS_ERROR, message);
}

export function renderLoading(container: HTMLElement): void {
  renderAlert(container, CLS_ALERT_INFO, CLS_LOADING, t('loading'));
}

export function renderEmpty(container: HTMLElement): void {
  renderAlert(container, CLS_ALERT_INFO, CLS_EMPTY, t('noComments'));
}

/** Callback fired when the user clicks "Reply" on a rendered comment. */
export type ReplyHandler = (statusUrl: string) => void;

export function renderTree(
  tree: TreeNode,
  container: HTMLElement,
  locale: string,
  onReply: ReplyHandler,
): void {
  const list = document.createElement('div');
  list.className = CLS_COMMENTS_LIST;
  for (const node of tree.replies) {
    list.appendChild(renderComment(node, locale, onReply));
  }
  container.appendChild(list);
}

function renderComment(node: TreeNode, locale: string, onReply: ReplyHandler): HTMLElement {
  // Only the synthetic root has `status: null` and is never rendered directly.
  const status = node.status!;
  const article = document.createElement('article');
  article.className = CLS_COMMENT;
  article.dataset['statusId'] = status.id;

  article.appendChild(renderHeader(status, locale));
  article.appendChild(renderContent(status.content));
  article.appendChild(renderActions(status, onReply));

  if (node.replies.length > 0) {
    const sub = document.createElement('div');
    sub.className = CLS_COMMENT_REPLIES;
    for (const child of node.replies) {
      sub.appendChild(renderComment(child, locale, onReply));
    }
    article.appendChild(sub);
  }
  return article;
}

function renderHeader(status: MastodonStatus, locale: string): HTMLElement {
  const header = document.createElement('header');
  header.className = CLS_COMMENT_HEADER;

  if (status.account?.avatar) {
    const avatar = document.createElement('img');
    avatar.className = CLS_AVATAR;
    avatar.src = status.account.avatar;
    avatar.alt = '';
    avatar.width = 32;
    avatar.height = 32;
    avatar.loading = 'lazy';
    header.appendChild(avatar);
  }

  const author = document.createElement('span');
  author.className = CLS_AUTHOR;
  const nameLink = document.createElement('a');
  nameLink.className = CLS_AUTHOR_LINK;
  nameLink.href = status.account?.url ?? '#';
  nameLink.target = '_blank';
  nameLink.rel = 'noopener nofollow';
  nameLink.textContent =
    status.account?.display_name || status.account?.username || '?';
  author.appendChild(nameLink);
  header.appendChild(author);

  const handle = document.createElement('span');
  handle.className = CLS_HANDLE;
  handle.textContent = '@' + (status.account?.acct ?? '');
  header.appendChild(handle);

  const date = document.createElement('time');
  date.className = CLS_DATE;
  if (status.created_at) {
    date.dateTime = status.created_at;
    const d = new Date(status.created_at);
    date.title = d.toLocaleString();
    date.textContent = formatRelativeDate(d, new Date(), locale);
  }
  header.appendChild(date);
  return header;
}

function renderContent(rawHtml: string): HTMLElement {
  const content = document.createElement('div');
  content.className = CLS_CONTENT;
  content.innerHTML = sanitizeHtml(rawHtml);
  return content;
}

function renderActions(status: MastodonStatus, onReply: ReplyHandler): HTMLElement {
  const actions = document.createElement('div');
  actions.className = CLS_ACTIONS;

  const replyBtn = document.createElement('button');
  replyBtn.type = 'button';
  replyBtn.className = CLS_ACTION_REPLY;
  replyBtn.textContent = t('replyAction');
  replyBtn.addEventListener('click', () => onReply(status.url));
  actions.appendChild(replyBtn);

  const viewLink = document.createElement('a');
  viewLink.className = CLS_ACTION_VIEW;
  viewLink.href = status.url;
  viewLink.target = '_blank';
  viewLink.rel = 'noopener nofollow';
  viewLink.textContent = t('viewOriginal');
  actions.appendChild(viewLink);
  return actions;
}
