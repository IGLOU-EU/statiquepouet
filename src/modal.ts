// Native <dialog> via showModal(). Focus trap, ESC dismiss, aria-modal,
// inert background and ::backdrop come from the UA. Autocomplete uses
// a <datalist>, the dropdown is UA-drawn.

import { t } from './state.js';
import { isValidInstance, normalizeInstance } from './parse.js';
import { buildPeersSearchUrl } from './urls.js';
import {
  ID_MODAL,
  ID_MODAL_INPUT,
  ID_MODAL_SUGGESTIONS,
  CLS_MODAL_CONTENT,
  CLS_MODAL_TITLE,
  CLS_MODAL_DESCRIPTION,
  CLS_MODAL_FORM,
  CLS_MODAL_LABEL,
  CLS_MODAL_BUTTONS,
  CLS_MODAL_CANCEL,
  CLS_MODAL_SUBMIT,
  CLS_ALERT,
  CLS_ALERT_ERROR,
  CLS_ERROR,
} from './classes.js';

const PEERS_DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 10;

function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** CORS-open and unauthenticated on Mastodon-API servers. Empty array on any failure. */
async function fetchPeerSuggestions(
  sourceInstance: string | null | undefined,
  query: string,
): Promise<string[]> {
  if (!sourceInstance || !query) return [];
  try {
    const res = await fetch(buildPeersSearchUrl(sourceInstance, query));
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter((x): x is string => typeof x === 'string').slice(0, MAX_SUGGESTIONS);
  } catch {
    return [];
  }
}

/**
 * Async hook called after the domain-syntax check. Return `null` to
 * accept (modal closes), or a localized error string to keep the
 * modal open with the error rendered inline.
 */
export type ModalValidator = (instance: string) => Promise<string | null>;

/**
 * Resolves with the normalized domain on submit, rejects with
 * `cancelled` on Cancel / ESC / backdrop click.
 */
export function showInstanceModal(
  sourceInstance: string | null | undefined,
  initialValue?: string | null,
  validate?: ModalValidator,
): Promise<string> {
  return new Promise((resolve, reject) => {
    document.getElementById(ID_MODAL)?.remove();

    const modal = document.createElement('dialog');
    modal.id = ID_MODAL;

    const content = document.createElement('div');
    content.className = CLS_MODAL_CONTENT;

    const title = document.createElement('h3');
    title.className = CLS_MODAL_TITLE;
    title.textContent = t('instanceModalTitle');
    content.appendChild(title);

    const desc = document.createElement('p');
    desc.className = CLS_MODAL_DESCRIPTION;
    desc.textContent = t('instanceModalDescription');
    content.appendChild(desc);

    const form = document.createElement('form');
    form.className = CLS_MODAL_FORM;

    const labelEl = document.createElement('label');
    labelEl.className = CLS_MODAL_LABEL;
    labelEl.htmlFor = ID_MODAL_INPUT;
    labelEl.textContent = t('instanceLabel');
    form.appendChild(labelEl);

    const input = buildInput(initialValue);
    form.appendChild(input);

    const datalist = document.createElement('datalist');
    datalist.id = ID_MODAL_SUGGESTIONS;
    form.appendChild(datalist);

    const errorMsg = document.createElement('p');
    errorMsg.className = `${CLS_ALERT} ${CLS_ALERT_ERROR} ${CLS_ERROR}`;
    errorMsg.hidden = true;
    form.appendChild(errorMsg);

    const { cancelBtn, submitBtn } = appendButtons(form);

    content.appendChild(form);
    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.showModal();
    if (input.value) input.select();

    let submitted = false;
    modal.addEventListener('close', () => {
      modal.remove();
      if (!submitted) reject(new Error('cancelled'));
    });

    const trySubmit = async (value: string) => {
      const normalized = normalizeInstance(value);
      if (!isValidInstance(normalized)) {
        errorMsg.textContent = t('instanceInvalid');
        errorMsg.hidden = false;
        return;
      }
      if (validate) {
        submitBtn.disabled = true;
        try {
          const errString = await validate(normalized);
          if (errString) {
            errorMsg.textContent = errString;
            errorMsg.hidden = false;
            return;
          }
        } finally {
          submitBtn.disabled = false;
        }
      }
      submitted = true;
      modal.close();
      resolve(normalized);
    };

    const renderSuggestions = (items: readonly string[]) => {
      datalist.innerHTML = '';
      for (const domain of items) {
        const opt = document.createElement('option');
        opt.value = domain;
        datalist.appendChild(opt);
      }
    };

    const debouncedSearch = debounce(async (q: string) => {
      const items = await fetchPeerSuggestions(sourceInstance, q);
      if (input.value.trim() !== q) return;
      renderSuggestions(items);
    }, PEERS_DEBOUNCE_MS);

    input.addEventListener('input', () => {
      const v = input.value.trim();
      errorMsg.hidden = true;
      if (v.length === 0) {
        datalist.innerHTML = '';
        return;
      }
      debouncedSearch(v);
    });

    cancelBtn.addEventListener('click', () => modal.close());

    // Backdrop clicks fire on the dialog itself (e.target === modal),
    // inner clicks bubble from descendants with a different target.
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      trySubmit(input.value);
    });
  });
}

function buildInput(initialValue?: string | null): HTMLInputElement {
  const input = document.createElement('input');
  input.id = ID_MODAL_INPUT;
  input.setAttribute('list', ID_MODAL_SUGGESTIONS);
  input.type = 'text';
  input.placeholder = t('instancePlaceholder');
  input.required = true;
  input.autocomplete = 'off';
  input.autocapitalize = 'none';
  input.spellcheck = false;
  if (initialValue) input.value = initialValue;
  return input;
}

function appendButtons(
  form: HTMLFormElement,
): { cancelBtn: HTMLButtonElement; submitBtn: HTMLButtonElement } {
  const buttons = document.createElement('div');
  buttons.className = CLS_MODAL_BUTTONS;

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = CLS_MODAL_CANCEL;
  cancelBtn.textContent = t('instanceCancel');
  buttons.appendChild(cancelBtn);

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = CLS_MODAL_SUBMIT;
  submitBtn.textContent = t('instanceSubmit');
  buttons.appendChild(submitBtn);

  form.appendChild(buttons);
  return { cancelBtn, submitBtn };
}
