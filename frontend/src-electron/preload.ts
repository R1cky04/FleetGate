import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('close-window'),
  openModulesWindow: () => ipcRenderer.send('open-modules-window'),
  returnToLogin: () => ipcRenderer.send('return-to-login'),
  openMaintenanceWindow: () => ipcRenderer.send('open-maintenance-window'),
  openSystemManagementWindow: () => ipcRenderer.send('open-system-management-window'),
  returnToModules: () => ipcRenderer.send('return-to-modules'),
})
