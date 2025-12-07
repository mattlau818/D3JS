// Scroll-based Narrative Controller
class ScrollNarrative {
    constructor() {
        this.currentScene = 0;
        this.scenes = [];
        this.scrollContainer = null;
        this.isTransitioning = false;
    }

    init() {
        this.setupScrollTriggers();
        this.bindScrollEvents();
    }

    setupScrollTriggers() {
        const sceneConfigs = [
            { id: 'scene-intro', trigger: 0, action: () => this.showIntro() },
            { id: 'scene-global', trigger: 0.15, action: () => this.transitionToGlobal() },
            { id: 'scene-network', trigger: 0.4, action: () => this.transitionToNetwork() },
            { id: 'scene-timeline', trigger: 0.7, action: () => this.transitionToTimeline() }
        ];
        this.scenes = sceneConfigs;
    }

    bindScrollEvents() {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    handleScroll() {
        const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        
        this.scenes.forEach((scene, index) => {
            if (scrollPercent >= scene.trigger && this.currentScene !== index) {
                this.currentScene = index;
                scene.action();
            }
        });
    }

    showIntro() {
        document.body.classList.add('scene-intro');
        document.body.classList.remove('scene-global', 'scene-network', 'scene-timeline');
    }

    transitionToGlobal() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        document.body.classList.add('scene-global');
        document.body.classList.remove('scene-intro', 'scene-network', 'scene-timeline');
        
        if (window.viz && window.appData) {
            window.viz.animateGlobalTransition();
        }
        
        setTimeout(() => { this.isTransitioning = false; }, 1000);
    }

    transitionToNetwork() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        document.body.classList.add('scene-network');
        document.body.classList.remove('scene-intro', 'scene-global', 'scene-timeline');
        
        if (window.viz && window.appData) {
            window.viz.createJobSkillNetwork(window.appData.aiOpportunities, window.appData.aiSkills);
        }
        
        setTimeout(() => { this.isTransitioning = false; }, 1000);
    }

    transitionToTimeline() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        document.body.classList.add('scene-timeline');
        document.body.classList.remove('scene-intro', 'scene-global', 'scene-network');
        
        if (window.viz && window.appData) {
            window.viz.createSkillTimeline(window.appData.aiSkills);
        }
        
        setTimeout(() => { this.isTransitioning = false; }, 1000);
    }
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.scrollNarrative = new ScrollNarrative();
}
