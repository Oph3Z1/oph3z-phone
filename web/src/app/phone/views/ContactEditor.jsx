import { useState } from 'react';
import { useDispatch } from 'react-redux';
import Avatar from '../components/Avatar';
import {
    addContact,
    editContact,
    setEditorDraft,
} from '../../../store/slices/contactsSlice';
import { setShareTo } from '../../../store/slices/messagesSlice';
import { openApp } from '../../../store/slices/phoneSlice';
import PhotoPickerSheet from '../../mail/PhotoPickerSheet';
import { useT } from '../../../i18n/useT';

export default function ContactEditor({ contact, onClose }) {
    const dispatch = useDispatch();
    const t = useT();
    const isEdit = !!(contact && contact.id);

    const [name, setName] = useState(contact?.name || '');
    const [number, setNumber] = useState(contact?.number || '');
    const [notes, setNotes] = useState(contact?.notes || '');
    const [img, setImg] = useState(contact?.img || '');
    const [picker, setPicker] = useState(false);

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

    const takePhoto = () => {
        dispatch(setEditorDraft({ id: contact?.id, name, number, notes, img }));
        dispatch(setShareTo('contact'));
        dispatch(openApp('camera'));
    };

    return (
        <div className="pa-editor pa-overlay-in">
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

            <div className="pa-editor__photobtns">
                <button className="pa-editor__photobtn" onClick={() => setPicker(true)}>
                    {t('phone.chooseFromGallery')}
                </button>
                <button className="pa-editor__photobtn" onClick={takePhoto}>
                    {t('phone.takePhoto')}
                </button>
                {img && (
                    <button
                        className="pa-editor__photobtn pa-editor__photobtn--danger"
                        onClick={() => setImg('')}
                    >
                        {t('phone.removePhoto')}
                    </button>
                )}
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

            {picker && (
                <PhotoPickerSheet
                    single
                    photosOnly
                    selected={[]}
                    onClose={() => setPicker(false)}
                    onDone={(items) => {
                        if (items && items[0]) setImg(items[0].url);
                        setPicker(false);
                    }}
                />
            )}
        </div>
    );
}
