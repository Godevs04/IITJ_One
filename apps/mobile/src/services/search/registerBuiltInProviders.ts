/**
 * Side-effect module: importing this once (from the app root) registers every
 * built-in search provider. A future module becomes searchable by adding a
 * new file under `./providers` that calls `registerSearchProvider` and
 * importing it here — no other wiring required.
 */
import './providers/homeProvider';
import './providers/messProvider';
import './providers/transportProvider';
import './providers/directoryProvider';
import './providers/noticesProvider';
import './providers/universityServicesProvider';
import './providers/campusAppsProvider';
import './providers/settingsProvider';
