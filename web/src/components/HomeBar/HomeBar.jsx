import { useDispatch, useSelector } from 'react-redux';
import './HomeBar.css';
import { closeApp } from '../../store/slices/phoneSlice';

export default function HomeBar() {
    const dispatch = useDispatch();
    const activeApp = useSelector((s) => s.phone.activeApp);

    const handleHome = () => {
        if (activeApp) dispatch(closeApp());
    };

    return (
        <div className="homebar" onClick={handleHome}>
            <div className="homebar__pill" />
        </div>
    );
}