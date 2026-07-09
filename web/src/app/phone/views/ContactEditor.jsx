import { useState } from 'react';
import { useDispatch } from 'react-redux';
import Avatar from '../components/Avatar';
import { addContact, editContact } from '../../../store/slices/contactsSlice';
import { useT } from '../../../i18n/useT';

export default function ContactEditor({ contact, onClose }) {
    const dispatch = useDispatch();
    const t = useT();
    const isEdit = !!(contact && contact.id);

    const [name, setName] = useState(contact?.name || '');
    const [number, setNumber] = useState(contact?.number || '');
    const [notes, setNotes] = useState(contact?.notes || '');
    const [img, setImg] = useState(contact?.img || '');

    const canSave = name.trim() && number.trim();

    const save = async () => {
        if (!canSave) return;
        const payload = {
            name: name.trim(),
            number: number.trim(),
            notes: notes.trim(),
            img: img.trim(),
        };
        if (isEdit) await dispatch(editContact({ id: contact.id, ...payload }));
        else await dispatch(addContact(payload));
        onClose();
    };

    return (
        <div className="pa-editor">
            <div className="pa-editor__nav">
                <button className="pa-editor__cancel" onClick={onClose}>
                    {t('phone.cancel')}
                </button>
                <span className="pa-editor__nav-title">
                    {isEdit ? t('phone.edit') : t('phone.newContact')}
                </span>
                <button className="pa-editor__save" onClick={save} disabled={!canSave}>
                    {isEdit ? t('phone.done') : t('phone.save')}
                </button>
            </div>

            <div className="pa-editor__avatar">
                <Avatar name={name} img={img} size="6em" />
            </div>

            <div className="pa-fields">
                <div className="pa-field">
                    <input
                        placeholder={t('phone.fieldName')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="pa-field">
                    <input
                        placeholder={t('phone.fieldNumber')}
                        value={number}
                        inputMode="tel"
                        onChange={(e) => setNumber(e.target.value)}
                    />
                </div>
            </div>

            <div className="pa-fields">
                <div className="pa-field">
                    <textarea
                        placeholder={t('phone.fieldNotes')}
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </div>

            <div className="pa-fields">
                <div className="pa-field">
                    <input
                        placeholder={t('phone.fieldImage')}
                        value={img}
                        onChange={(e) => setImg(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}