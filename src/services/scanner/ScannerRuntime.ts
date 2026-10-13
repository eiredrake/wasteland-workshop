import {OcrService} from '../ocr/OcrService'
import {MockOcrProvider} from '../ocr/MockOcrProvider'
import {DiagnosticRecorder} from './Diagnostics'
import {loadScannerSettings} from '../../features/settings/ScannerSettings'
export const scannerDiagnostics=new DiagnosticRecorder()
export function configureScannerDiagnostics(){const settings=loadScannerSettings();scannerDiagnostics.configure(settings.diagnostics,settings.includeImages);return settings}
// Creating the service does not initialize/load a provider at app startup.
export const ocrService=new OcrService(new MockOcrProvider(),scannerDiagnostics.lifecycle,event=>scannerDiagnostics.record(event))
