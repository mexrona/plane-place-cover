import { FormEvent, useState } from "react";
import type { DesignExport } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (client: NonNullable<DesignExport["client"]>) => void;
}

export function SubmitModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  if (!open) return null;

  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onSubmit({ name: name.trim(), phone: phone.trim(), note: note.trim() });
    onClose();
    setName("");
    setPhone("");
    setNote("");
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal onMouseDown={(ev) => ev.stopPropagation()}>
        <h2>Отправить на расчёт</h2>
        <p className="muted small">
          На ваше устройство будут сохранены файл с параметрами заказа и снимок 3D-сцены.
        </p>
        <form onSubmit={handle}>
          <label>
            Имя
            <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <label>
            Телефон
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </label>
          <label>
            Комментарий
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="primary">
              Скачать заявку + скрин
            </button>
          </div>
        </form>
        <style>{`
          .modal-backdrop {
            position: fixed; inset: 0; background: rgba(15, 20, 30, 0.45);
            display: flex; align-items: center; justify-content: center; z-index: 50; padding: 1rem;
          }
          .modal {
            background: #fff; border-radius: 12px; padding: 1.25rem; width: 100%; max-width: 420px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.15);
          }
          .modal h2 { margin: 0 0 0.5rem; font-size: 1.15rem; }
          .modal form { display: flex; flex-direction: column; gap: 0.65rem; }
          .modal label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.88rem; }
          .modal input, .modal textarea {
            border: 1px solid #c9d0db; border-radius: 8px; padding: 0.45rem 0.55rem;
          }
          .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
        `}</style>
      </div>
    </div>
  );
}
