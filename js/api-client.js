const API_BASE_URL = 'https://d3jsbackend.duckdns.org/api';

class APIClient {
    async fetchStats() {
        const response = await fetch(`${API_BASE_URL}/stats`);
        return await response.json();
    }

    async fetchNarrativeStage1GlobalShift() {
        const response = await fetch(`${API_BASE_URL}/narrative/stage1/global-shift`);
        return await response.json();
    }

    async fetchNarrativeStage1IndustryTransformation() {
        const response = await fetch(`${API_BASE_URL}/narrative/stage1/industry-transformation`);
        return await response.json();
    }

    async fetchNarrativeStage2AutomationSpectrum() {
        const response = await fetch(`${API_BASE_URL}/narrative/stage2/automation-spectrum`);
        return await response.json();
    }

    async fetchNarrativeStage2AIJobOpportunities() {
        const response = await fetch(`${API_BASE_URL}/narrative/stage2/ai-job-opportunities`);
        return await response.json();
    }

    async fetchAISkills() {
        const response = await fetch(`${API_BASE_URL}/skills/ai`);
        return await response.json();
    }

    async fetchTraditionalSkills() {
        const response = await fetch(`${API_BASE_URL}/skills/traditional`);
        return await response.json();
    }

    async fetchNarrativeStage3SkillSalaryPremium() {
        const response = await fetch(`${API_BASE_URL}/narrative/stage3/skill-salary-premium`);
        return await response.json();
    }

    async fetchMetadata() {
        const response = await fetch(`${API_BASE_URL}/metadata`);
        return await response.json();
    }
}
