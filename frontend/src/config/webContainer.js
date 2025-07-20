import { WebContainer } from '@webcontainer/api';

let webContainerInstance = null;
let isInitializing = false;
let initPromise = null;

const getWebContainer = async () => {
    // If already initialized, return the instance
    if (webContainerInstance) {
        return webContainerInstance;
    }
    
    // If currently initializing, wait for the existing promise
    if (isInitializing && initPromise) {
        return initPromise;
    }
    
    // Start initialization
    isInitializing = true;
    initPromise = WebContainer.boot()
        .then(instance => {
            webContainerInstance = instance;
            isInitializing = false;
            return instance;
        })
        .catch(error => {
            isInitializing = false;
            initPromise = null;
            throw error;
        });
    
    return initPromise;
};

export { getWebContainer };