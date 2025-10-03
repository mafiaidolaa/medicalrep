// Minimal maps service stub for settings page
export const mapsService = {
  async getMapsSettings() {
    return { enabled: false, location_tracking: false };
  },
  async updateMapsSettings(settings: any) {
    return { ...settings };
  },
};
