// Browser fingerprinting for user identification
class BrowserFingerprint {
    constructor() {
        this.fingerprint = null;
    }

    async generateFingerprint() {
        if (this.fingerprint) return this.fingerprint;

        const components = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            screenColorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack,
            hardwareConcurrency: navigator.hardwareConcurrency || 0,
        };

        // Add canvas fingerprint for more uniqueness
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('TeachSG fingerprint', 2, 2);
        components.canvasFingerprint = canvas.toDataURL();

        // Generate hash from all components
        const fingerprintString = JSON.stringify(components);
        this.fingerprint = await this.hashString(fingerprintString);

        return this.fingerprint;
    }

    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return 'fp_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    }

    async getUserId() {
        return await this.generateFingerprint();
    }
}

// Global fingerprint instance
window.browserFingerprint = new BrowserFingerprint();