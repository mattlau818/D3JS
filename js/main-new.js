// Main Application Logic
const API_BASE = 'https://d3jsbackend.duckdns.org/api';
let viz, api, appData = {};
let selectedCountry = null;
let selectedJob = null;
let currentFilter = 'all';

// Global filter function
window.filterByCountry = function(countryName) {
    selectedCountry = countryName;
    console.log('Filtering by country:', countryName);
    document.getElementById('map-insight').innerHTML = `<strong>Filtering by: ${countryName}</strong> - <button onclick="window.resetFilters()" style="background: #6366f1; color: white; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">Reset</button>`;
    
    // Scroll to stage 2
    switchStage(2);
    
    // Filter scatter plot
    setTimeout(() => {
        const countryJobs = appData.aiOpportunities.jobs.filter(j => j.company_location === countryName);
        console.log('Found jobs for country:', countryJobs.length);
        if (countryJobs.length > 0) {
            viz.createScatterPlot(appData.automationSpectrum, {jobs: countryJobs}, currentFilter);
            document.getElementById('scatter-insight').innerHTML = `Showing ${countryJobs.length} AI jobs in <strong>${countryName}</strong> - <button onclick="window.resetFilters()" style="background: #6366f1; color: white; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">Reset</button>`;
        } else {
            document.getElementById('scatter-insight').innerHTML = `No AI jobs found in <strong>${countryName}</strong> - <button onclick="window.resetFilters()" style="background: #6366f1; color: white; border: none; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">Reset</button>`;
        }
    }, 500);
};

document.addEventListener('DOMContentLoaded', async () => {
    viz = new Visualizations();
    api = new APIClient();
    
    await loadAllData();
    initializeApp();
    setupEventListeners();
});

async function loadAllData() {
    try {
        console.log('🔄 Starting data load from API...');
        console.log('API Base URL:', API_BASE);
        
        const stats = await api.fetchStats();
        console.log('✅ Stats loaded:', stats);
        
        const globalShift = await api.fetchNarrativeStage1GlobalShift();
        console.log('✅ Global shift loaded. Countries:', globalShift.countries?.length);
        
        const industryData = await api.fetchNarrativeStage1IndustryTransformation();
        console.log('✅ Industry data loaded. Industries:', industryData.industries?.length);
        
        const automationSpectrum = await api.fetchNarrativeStage2AutomationSpectrum();
        console.log('✅ Automation spectrum loaded. Occupations:', automationSpectrum.occupations?.length);
        
        const aiOpportunities = await api.fetchNarrativeStage2AIJobOpportunities();
        console.log('✅ AI opportunities loaded. Jobs:', aiOpportunities.jobs?.length);
        
        const aiSkills = await api.fetchAISkills();
        console.log('✅ AI skills loaded:', aiSkills?.length);
        
        const traditionalSkills = await api.fetchTraditionalSkills();
        console.log('✅ Traditional skills loaded:', traditionalSkills?.length);

        appData = { stats, globalShift, industryData, automationSpectrum, aiOpportunities, aiSkills, traditionalSkills };
        console.log('✅ All data loaded successfully!');
        console.log('📊 Data summary:', {
            countries: globalShift.countries?.length,
            industries: industryData.industries?.length,
            occupations: automationSpectrum.occupations?.length,
            aiJobs: aiOpportunities.jobs?.length,
            aiSkills: aiSkills?.length
        });
        
        document.getElementById('total-jobs').textContent = stats.total_ai_jobs.toLocaleString();
        document.getElementById('avg-salary').textContent = `$${Math.round(stats.avg_ai_salary / 1000)}K`;
        
        document.getElementById('loading-screen').classList.add('hidden');
    } catch (error) {
        console.error('❌ Error loading data:', error);
        document.getElementById('loading-screen').innerHTML = `
            <div class="loader-container">
                <h2 style="color: #ef4444;">Error Loading Data</h2>
                <p>${error.message}</p>
                <p style="margin-top: 20px;">Make sure backend is running:</p>
                <code style="background: #1e293b; color: #10b981; padding: 10px; border-radius: 6px; display: block; margin: 10px 0;">cd backend && python app.py</code>
                <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Retry</button>
            </div>
        `;
    }
}

function initializeApp() {
    // Stage 1
    if (appData.globalShift && appData.globalShift.countries) {
        viz.createWorldMap(appData.globalShift.countries, 'jobs');
    }
    if (appData.industryData && appData.industryData.industries) {
        console.log('Creating industry chart with data:', appData.industryData);
        viz.createIndustryChart(appData.industryData);
    } else {
        console.error('Industry data not available:', appData.industryData);
    }
    document.getElementById('map-insight').innerHTML = 'Click countries to filter visualizations.';
    
    // Stage 2 - Load when scrolled to
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.id === 'stage2' && !entry.target.dataset.loaded) {
                    if (appData.automationSpectrum && appData.aiOpportunities) {
                        viz.createScatterPlot(appData.automationSpectrum, appData.aiOpportunities, 'all');
                        viz.createRiskDistribution(appData.automationSpectrum);
                    }
                    entry.target.dataset.loaded = 'true';
                }
                if (entry.target.id === 'stage3' && !entry.target.dataset.loaded) {
                    if (appData.aiSkills) {
                        viz.createSkillsChart(appData.aiSkills);
                    }
                    entry.target.dataset.loaded = 'true';
                }
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(document.getElementById('stage2'));
    observer.observe(document.getElementById('stage3'));
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const stage = link.getAttribute('data-stage');
            switchStage(stage);
        });
    });

    // Stage 1 Controls - Map Metrics
    document.querySelectorAll('#stage1 .control-btn[data-metric]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#stage1 .control-btn[data-metric]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            viz.createWorldMap(appData.globalShift.countries, btn.getAttribute('data-metric'));
        });
    });

    // Stage 2 Controls - Scatter Plot Filters
    document.querySelectorAll('#stage2 .control-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Filter button clicked:', btn.getAttribute('data-filter'));
            document.querySelectorAll('#stage2 .control-btn[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.getAttribute('data-filter');
            currentFilter = filter;
            
            // Use filtered data if country is selected
            const jobsData = selectedCountry ? 
                {jobs: appData.aiOpportunities.jobs.filter(j => j.company_location === selectedCountry)} : 
                appData.aiOpportunities;
            
            viz.createScatterPlot(appData.automationSpectrum, jobsData, filter);
            
            const insights = {
                'all': 'Showing all jobs. Notice the inverse correlation between risk and salary.',
                'high-salary': '🔍 Zoomed to high-salary jobs ($120K+). Premium compensation across all risk levels.',
                'ai': '🔍 Zoomed to AI jobs only (0-30% risk). Premium salaries with low automation risk.'
            };
            
            let insightText = insights[filter] || insights['all'];
            if (selectedCountry) {
                insightText += ` (Filtered by ${selectedCountry})`;
            }
            document.getElementById('scatter-insight').innerHTML = `<strong>${insightText}</strong> Click any dot for details.`;
        });
    });

    // Stage 3 Controls - Skills View
    document.querySelectorAll('#stage3 .control-btn[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#stage3 .control-btn[data-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.getAttribute('data-view');
            if (view === 'salary') {
                // Load and show skill salary premium data
                api.fetchNarrativeStage3SkillSalaryPremium().then(data => {
                    viz.createSkillsSalaryChart(data.skills);
                });
            } else if (view === 'growth') {
                // Show growth rate (use same data, different sort)
                viz.createSkillsChart(appData.aiSkills, 'growth');
            } else {
                viz.createSkillsChart(appData.aiSkills);
            }
        });
    });

    // Scroll Progress
    window.addEventListener('scroll', updateProgress);
}

function switchStage(stageNum) {
    document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    const targetId = stageNum === 0 ? 'intro' : `stage${stageNum}`;
    document.getElementById(targetId).classList.add('active');
    document.querySelector(`.nav-link[data-stage="${stageNum}"]`).classList.add('active');
    
    document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
}

// Make switchStage globally accessible
window.switchStage = switchStage;

function updateProgress() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = window.scrollY;
    const progress = (scrolled / documentHeight) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
}

// Reset filters
window.resetFilters = function() {
    console.log('Resetting filters');
    selectedCountry = null;
    selectedJob = null;
    currentFilter = 'all';
    document.getElementById('map-insight').innerHTML = 'Click countries to filter visualizations.';
    viz.createScatterPlot(appData.automationSpectrum, appData.aiOpportunities, 'all');
    document.getElementById('scatter-insight').innerHTML = '<strong>Showing all jobs. Notice the inverse correlation between risk and salary.</strong> Click any dot for details.';
    document.querySelector('#ai-opportunities').innerHTML = `
        <div style="padding: 50px 30px; text-align: center; color: #64748b;">
            <div style="font-size: 64px; margin-bottom: 20px; animation: float 3s ease-in-out infinite;">💼</div>
            <h4 style="margin-bottom: 12px; color: #1e293b; font-size: 20px; font-weight: 700;">AI Job Market</h4>
            <p style="font-size: 14px; line-height: 1.6; max-width: 300px; margin: 0 auto;">Click any job in the scatter plot above to see detailed career insights and salary information</p>
        </div>
    `;
    document.querySelectorAll('#stage2 .control-btn[data-filter]').forEach(b => b.classList.remove('active'));
    document.querySelector('#stage2 .control-btn[data-filter="all"]').classList.add('active');
};

// Make sure these functions are globally accessible
if (typeof window.showJobNetworkDetails === 'undefined') {
    window.showJobNetworkDetails = function(jobNode, links, nodes) {
    const relatedSkills = links
        .filter(l => l.source.id === jobNode.id)
        .map(l => nodes.find(n => n.id === l.target.id))
        .filter(n => n);
    
    document.querySelector('#network-details').innerHTML = `
        <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                <div>
                    <h4 style="color: #1e293b; font-size: 18px; margin-bottom: 8px;">${jobNode.name}</h4>
                    <p style="color: #64748b; font-size: 13px;">AI Job Role</p>
                </div>
            </div>
            
            <div style="padding: 16px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 12px; margin-bottom: 16px; border-left: 4px solid #10b981;">
                <div style="font-size: 11px; color: #065f46; font-weight: 600; margin-bottom: 4px;">SALARY</div>
                <div style="font-size: 24px; font-weight: 700; color: #059669;">$${jobNode.salary?.toLocaleString()}</div>
            </div>
            
            <div style="margin-top: 20px;">
                <h5 style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">🎯 Required Skills (${relatedSkills.length})</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${relatedSkills.slice(0, 8).map(s => `
                        <span style="padding: 6px 12px; background: #e0e7ff; color: #4338ca; border-radius: 6px; font-size: 12px; font-weight: 600;">${s.name}</span>
                    `).join('')}
                </div>
            </div>
            
            <button onclick="window.scrollToTimeline()" style="width: 100%; margin-top: 20px; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                📈 View Skill Trends
            </button>
        </div>
    `;
    };
}

// NEW: Show skill network details
if (typeof window.showSkillNetworkDetails === 'undefined') {
    window.showSkillNetworkDetails = function(skillNode, links, nodes) {
    const relatedJobs = links
        .filter(l => l.target.id === skillNode.id)
        .map(l => nodes.find(n => n.id === l.source.id))
        .filter(n => n);
    
    document.querySelector('#network-details').innerHTML = `
        <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                <div>
                    <h4 style="color: #1e293b; font-size: 18px; margin-bottom: 8px;">${skillNode.name}</h4>
                    <p style="color: #64748b; font-size: 13px;">In-Demand Skill</p>
                </div>
            </div>
            
            <div style="padding: 16px; background: linear-gradient(135deg, #eff6ff, #dbeafe); border-radius: 12px; margin-bottom: 16px; border-left: 4px solid #3b82f6;">
                <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">DEMAND</div>
                <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${skillNode.count?.toLocaleString()} jobs</div>
            </div>
            
            <div style="margin-top: 20px;">
                <h5 style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">💼 Related Jobs (${relatedJobs.length})</h5>
                <div style="display: grid; gap: 8px; max-height: 200px; overflow-y: auto;">
                    ${relatedJobs.slice(0, 6).map(j => `
                        <div style="padding: 10px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #6366f1;">
                            <div style="font-size: 13px; font-weight: 600; color: #1e293b;">${j.name}</div>
                            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">$${j.salary?.toLocaleString()}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <button onclick="window.scrollToTimeline()" style="width: 100%; margin-top: 20px; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                📈 View Skill Growth
            </button>
        </div>
    `;
    };
}

// NEW: Show skill timeline details
if (typeof window.showSkillTimelineDetails === 'undefined') {
    window.showSkillTimelineDetails = function(skillData) {
    const growth = ((skillData.values[4].demand / skillData.values[0].demand - 1) * 100).toFixed(0);
    const trend = growth > 0 ? '📈' : '📉';
    
    document.querySelector('#timeline-details').innerHTML = `
        <div style="padding: 24px;">
            <h4 style="color: #1e293b; font-size: 18px; margin-bottom: 16px;">${skillData.name}</h4>
            
            <div style="padding: 16px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">5-YEAR GROWTH</div>
                <div style="font-size: 32px; font-weight: 700; color: #d97706;">${trend} ${growth}%</div>
            </div>
            
            <div style="margin-top: 20px;">
                <h5 style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">📊 Demand Over Time</h5>
                <div style="display: grid; gap: 8px;">
                    ${skillData.values.map(v => `
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                            <span style="font-size: 12px; font-weight: 600; color: #64748b;">${v.year}</span>
                            <span style="font-size: 12px; font-weight: 700; color: #1e293b;">${Math.round(v.demand).toLocaleString()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-top: 20px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981;">
                <p style="font-size: 12px; color: #065f46; line-height: 1.6;">
                    <strong>💡 Insight:</strong> ${growth > 50 ? 'Explosive growth! High priority skill.' : growth > 20 ? 'Strong growth trajectory.' : 'Steady demand.'}
                </p>
            </div>
        </div>
    `;
    };
}

// NEW: Scroll to timeline section
if (typeof window.scrollToTimeline === 'undefined') {
    window.scrollToTimeline = function() {
        const timeline = document.getElementById('scroll-section-3');
        if (timeline) {
            timeline.scrollIntoView({ behavior: 'smooth' });
        }
    };
}

// Show job details
window.showJobDetails = function(jobData) {
    selectedJob = jobData;
    
    // Fetch skills for this job
    if (jobData.type === 'ai' && jobData.jobId) {
        const jobSkills = appData.aiSkills.filter(s => s.job_id === jobData.jobId).slice(0, 8);
        
        document.querySelector('#ai-opportunities').innerHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                    <div>
                        <h4 style="color: #1e293b; font-size: 18px; margin-bottom: 8px;">${jobData.name}</h4>
                        <p style="color: #64748b; font-size: 13px;">${jobData.experience || 'Experience level not specified'}</p>
                    </div>
                    <button onclick="window.resetFilters()" style="padding: 8px 12px; background: #e2e8f0; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">✕</button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                    <div style="padding: 12px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981;">
                        <div style="font-size: 11px; color: #065f46; font-weight: 600; margin-bottom: 4px;">SALARY</div>
                        <div style="font-size: 20px; font-weight: 700; color: #059669;">$${jobData.salary.toLocaleString()}</div>
                    </div>
                    <div style="padding: 12px; background: #eff6ff; border-radius: 8px; border-left: 3px solid #3b82f6;">
                        <div style="font-size: 11px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">RISK</div>
                        <div style="font-size: 20px; font-weight: 700; color: #2563eb;">${(jobData.risk * 100).toFixed(0)}%</div>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <h5 style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">💡 Key Insight</h5>
                    <p style="font-size: 13px; color: #475569; line-height: 1.6;">
                        ${jobData.type === 'ai' ? 
                            'This AI role offers <strong>low automation risk</strong> and <strong>high salary potential</strong>. Perfect for career growth in the AI era.' : 
                            `This role has <strong>${jobData.riskLevel}</strong> of automation. Consider transitioning to AI-related positions.`
                        }
                    </p>
                </div>
                
                <button onclick="switchStage(3)" style="width: 100%; margin-top: 16px; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                    🎯 Explore Required Skills
                </button>
            </div>
        `;
    } else {
        // Traditional job
        document.querySelector('#ai-opportunities').innerHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                    <div>
                        <h4 style="color: #1e293b; font-size: 18px; margin-bottom: 8px;">${jobData.name}</h4>
                        <p style="color: #64748b; font-size: 13px;">Traditional Occupation</p>
                    </div>
                    <button onclick="window.resetFilters()" style="padding: 8px 12px; background: #e2e8f0; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">✕</button>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
                    <div style="padding: 12px; background: #fef3c7; border-radius: 8px; border-left: 3px solid #f59e0b;">
                        <div style="font-size: 11px; color: #92400e; font-weight: 600; margin-bottom: 4px;">EST. SALARY</div>
                        <div style="font-size: 20px; font-weight: 700; color: #d97706;">$${jobData.salary.toLocaleString()}</div>
                    </div>
                    <div style="padding: 12px; background: #fef2f2; border-radius: 8px; border-left: 3px solid #ef4444;">
                        <div style="font-size: 11px; color: #991b1b; font-weight: 600; margin-bottom: 4px;">AUTO RISK</div>
                        <div style="font-size: 20px; font-weight: 700; color: #dc2626;">${(jobData.risk * 100).toFixed(0)}%</div>
                    </div>
                </div>
                
                <div style="padding: 16px; background: #fef2f2; border-radius: 8px; border-left: 3px solid #ef4444; margin-bottom: 16px;">
                    <h5 style="font-size: 13px; font-weight: 600; color: #991b1b; margin-bottom: 8px;">⚠️ High Automation Risk</h5>
                    <p style="font-size: 13px; color: #7f1d1d; line-height: 1.6;">
                        This occupation faces significant automation risk. Consider reskilling for AI-related careers.
                    </p>
                </div>
                
                <button onclick="switchStage(3)" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                    🚀 View Career Transition Paths
                </button>
            </div>
        `;
    }
};
