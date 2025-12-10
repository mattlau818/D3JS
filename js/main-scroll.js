// Main Scroll-Based Application
let viz, api, appData = {};
let currentMapMetric = 'jobs';
let interactionTracker = {
    countryClicked: false,
    jobNodeClicked: false,
    skillLineClicked: false,
    startTime: null,
    count: 0
};

document.addEventListener('DOMContentLoaded', async () => {
    viz = new Visualizations();
    api = new APIClient();
    
    await loadAllData();
    initializeScrollApp();
    setupScrollListeners();
    startProgressiveDisclosure();
});

// Progressive disclosure system
function startProgressiveDisclosure() {
    interactionTracker.startTime = Date.now();
    
    // 10-second takeaway
    setTimeout(() => {
        const box = document.getElementById('takeaway-10s');
        if (box) {
            box.style.display = 'block';
            box.style.animation = 'slideInDown 0.5s ease-out';
        }
    }, 10000);
    
    // 30-second takeaway
    setTimeout(() => {
        const box = document.getElementById('takeaway-30s');
        if (box) {
            box.style.display = 'block';
            box.style.animation = 'slideInDown 0.5s ease-out';
        }
    }, 30000);
    
    // 60-second takeaway
    setTimeout(() => {
        const box = document.getElementById('takeaway-60s');
        if (box) {
            box.style.display = 'block';
            box.style.animation = 'slideInDown 0.5s ease-out';
        }
    }, 60000);
}

function updateInteractionProgress() {
    interactionTracker.count = 
        (interactionTracker.countryClicked ? 1 : 0) +
        (interactionTracker.jobNodeClicked ? 1 : 0) +
        (interactionTracker.skillLineClicked ? 1 : 0);
    
    const progressEl = document.getElementById('progress-count');
    const progressBox = document.getElementById('exploration-progress');
    
    if (progressEl) progressEl.textContent = interactionTracker.count;
    if (progressBox && interactionTracker.count > 0) {
        progressBox.style.display = 'block';
    }
    
    // Hide action prompt after first click
    if (interactionTracker.count > 0) {
        const prompt = document.getElementById('map-action-prompt');
        if (prompt) prompt.style.display = 'none';
    }
}

async function loadAllData() {
    try {
        const stats = await api.fetchStats();
        const globalShift = await api.fetchNarrativeStage1GlobalShift();
        const industryData = await api.fetchNarrativeStage1IndustryTransformation();
        const automationSpectrum = await api.fetchNarrativeStage2AutomationSpectrum();
        const aiOpportunities = await api.fetchNarrativeStage2AIJobOpportunities();
        const aiSkills = await api.fetchAISkills();
        const traditionalSkills = await api.fetchTraditionalSkills();
        
        // NEW: Load storytelling data
        const educationData = await fetch(`${API_BASE_URL}/narrative/education-premium`).then(r => r.json());
        const companyData = await fetch(`${API_BASE_URL}/narrative/company-size-impact`).then(r => r.json());

        appData = { stats, globalShift, industryData, automationSpectrum, aiOpportunities, aiSkills, traditionalSkills, educationData, companyData };
        window.appData = appData;
        
        console.log('All data loaded for scroll narrative');
        console.log('Education data:', educationData);
        console.log('Company data:', companyData);
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading data. Make sure backend is running: cd backend && python app.py');
    }
}

function initializeScrollApp() {
    // Initialize scroll narrative controller
    if (window.scrollNarrative) {
        window.scrollNarrative.init();
    }
    
    // Create initial world map
    if (appData.globalShift && appData.globalShift.countries) {
        viz.createWorldMapScroll(appData.globalShift.countries, 'jobs');
    }
    
    // Setup intersection observers for lazy loading
    setupIntersectionObservers();
}

function setupIntersectionObservers() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                
                if (sectionId === 'scroll-section-2' && !entry.target.dataset.loaded) {
                    // Load network graph
                    if (appData.aiOpportunities && appData.aiSkills) {
                        viz.createJobSkillNetwork(appData.aiOpportunities, appData.aiSkills);
                    }
                    entry.target.dataset.loaded = 'true';
                }
                
                if (sectionId === 'scroll-section-3' && !entry.target.dataset.loaded) {
                    // Load timeline
                    if (appData.aiSkills) {
                        viz.createSkillTimeline(appData.aiSkills);
                    }
                    entry.target.dataset.loaded = 'true';
                }
            }
        });
    }, { threshold: 0.2 });
    
    document.querySelectorAll('.scroll-section').forEach(section => {
        observer.observe(section);
    });
}

function setupScrollListeners() {
    // Update progress bar
    window.addEventListener('scroll', () => {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        document.getElementById('scroll-progress').style.width = `${scrollPercent}%`;
        
        // Activate text blocks based on scroll position
        updateTextBlocks();
        
        // Show annotations based on scroll
        showScrollAnnotations();
    });
    
    // Scroll-triggered annotations
    let annotationsShown = { network: false, timeline: false };
    
    function showScrollAnnotations() {
        const networkSection = document.getElementById('scroll-section-2');
        const timelineSection = document.getElementById('scroll-section-3');
        
        if (networkSection && !annotationsShown.network) {
            const rect = networkSection.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.5) {
                annotationsShown.network = true;
                // Add annotation to network
                setTimeout(() => {
                    const networkContainer = document.getElementById('network-graph');
                    if (networkContainer && !document.getElementById('network-annotation')) {
                        const annotation = document.createElement('div');
                        annotation.id = 'network-annotation';
                        annotation.style.cssText = 'position: absolute; top: 20px; right: 20px; background: rgba(245,158,11,0.95); color: white; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; max-width: 200px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 100; animation: pulse 2s infinite;';
                        annotation.innerHTML = '👆 Notice: Most jobs connect to only 3-5 skills. Click to explore!';
                        networkContainer.appendChild(annotation);
                    }
                }, 1000);
            }
        }
        
        if (timelineSection && !annotationsShown.timeline) {
            const rect = timelineSection.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.5) {
                annotationsShown.timeline = true;
                // Add annotation to timeline
                setTimeout(() => {
                    const timelineContainer = document.getElementById('skill-timeline');
                    if (timelineContainer && !document.getElementById('timeline-annotation')) {
                        const annotation = document.createElement('div');
                        annotation.id = 'timeline-annotation';
                        annotation.style.cssText = 'position: absolute; top: 20px; left: 20px; background: rgba(16,185,129,0.95); color: white; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; max-width: 200px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 100; animation: pulse 2s infinite;';
                        annotation.innerHTML = '👆 See the steep lines? Those are the skills growing fastest!';
                        timelineContainer.appendChild(annotation);
                    }
                }, 1000);
            }
        }
    }
    
    // Text block activation
    function updateTextBlocks() {
        const textBlocks = document.querySelectorAll('.text-block');
        textBlocks.forEach(block => {
            const rect = block.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4;
            
            if (isVisible) {
                block.classList.add('active');
                const step = block.getAttribute('data-step');
                if (step === '0') updateMapMetric('jobs');
                else if (step === '1') updateMapMetric('salary');
                else if (step === '2') updateMapMetric('remote');
            } else {
                block.classList.remove('active');
            }
        });
    }
}

function updateMapMetric(metric) {
    if (currentMapMetric === metric) return;
    currentMapMetric = metric;
    
    if (appData.globalShift && appData.globalShift.countries) {
        viz.createWorldMapScroll(appData.globalShift.countries, metric);
    }
}

// Network filtering
window.filterNetwork = function(filter) {
    console.log('🔍 filterNetwork called with:', filter);
    document.querySelectorAll('.viz-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    let filteredJobs = appData.aiOpportunities.jobs;
    console.log('  - Starting with jobs:', filteredJobs.length);
    
    if (filter === 'high-salary') {
        filteredJobs = filteredJobs.filter(j => j.salary_usd > 120000);
        console.log('  - After high-salary filter:', filteredJobs.length);
    } else if (filter === 'trending') {
        // Trending = highest salary jobs
        filteredJobs = filteredJobs.sort((a, b) => b.salary_usd - a.salary_usd).slice(0, 50);
        console.log('  - After trending filter (top 50):', filteredJobs.length);
    }
    
    console.log('  - Creating network with', filteredJobs.length, 'jobs');
    viz.createJobSkillNetwork({ jobs: filteredJobs }, appData.aiSkills);
};

// Interaction feedback
function showInteractionFeedback(message) {
    const feedback = document.createElement('div');
    feedback.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: rgba(16,185,129,0.95); color: white; padding: 16px 24px; border-radius: 12px; font-size: 15px; font-weight: 600; box-shadow: 0 6px 20px rgba(0,0,0,0.3); z-index: 10000; animation: slideInDown 0.5s ease-out;';
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
        feedback.style.animation = 'slideOutUp 0.5s ease-out';
        setTimeout(() => feedback.remove(), 500);
    }, 3000);
}

// Click handlers for network and timeline
window.showJobNetworkDetails = function(jobNode, links, nodes) {
    console.log('🔍 showJobNetworkDetails called');
    console.log('  - Job node:', jobNode);
    console.log('  - Links count:', links.length);
    console.log('  - Nodes count:', nodes.length);
    
    // Track interaction
    if (!interactionTracker.jobNodeClicked) {
        interactionTracker.jobNodeClicked = true;
        updateInteractionProgress();
        showInteractionFeedback('🎯 Insight unlocked! See the skill breakdown on the right.');
    }
    
    const relatedSkills = links
        .filter(l => l.source.id === jobNode.id)
        .map(l => nodes.find(n => n.id === l.target.id))
        .filter(n => n);
    
    console.log('  - Related skills found:', relatedSkills.length);
    console.log('  - Skills:', relatedSkills.map(s => s.name));
    
    const sidebarHtml = `
        <div style="padding: 24px;">
            <h4 style="color: #1e293b; font-size: 18px; margin-bottom: 8px;">${jobNode.name}</h4>
            <p style="color: #64748b; font-size: 13px; margin-bottom: 16px;">AI Job Role</p>
            
            <div style="padding: 16px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 12px; margin-bottom: 16px; border-left: 4px solid #10b981;">
                <div style="font-size: 11px; color: #065f46; font-weight: 600; margin-bottom: 4px;">SALARY</div>
                <div style="font-size: 24px; font-weight: 700; color: #059669;">$${jobNode.salary?.toLocaleString()}</div>
            </div>
            
            <div style="margin-top: 20px;">
                <h5 style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 12px;">🎯 Required Skills (${relatedSkills.length})</h5>
                <div id="skill-demand-chart" style="margin-top: 12px;"></div>
            </div>
            
            <button onclick="window.scrollToTimeline()" style="width: 100%; margin-top: 20px; padding: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                📈 View Skill Trends
            </button>
        </div>
    `;
    
    document.querySelector('#network-details').innerHTML = sidebarHtml;
    
    // Create linked bar chart
    if (relatedSkills.length > 0) {
        createSkillDemandChart(relatedSkills);
    }
};

// NEW: Linked bar chart visualization
function createSkillDemandChart(skills) {
    const container = d3.select('#skill-demand-chart');
    container.selectAll('*').remove();
    
    const width = 280;
    const height = skills.length * 35;
    const margin = { top: 10, right: 40, bottom: 10, left: 10 };
    
    const maxCount = d3.max(skills, d => d.count || 100);
    const xScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([0, width - margin.left - margin.right]);
    
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const bars = svg.selectAll('g')
        .data(skills)
        .enter()
        .append('g')
        .attr('transform', (d, i) => `translate(${margin.left}, ${i * 35})`);
    
    // Background bars
    bars.append('rect')
        .attr('width', width - margin.left - margin.right)
        .attr('height', 28)
        .attr('fill', '#f1f5f9')
        .attr('rx', 4);
    
    // Data bars
    bars.append('rect')
        .attr('width', 0)
        .attr('height', 28)
        .attr('fill', '#6366f1')
        .attr('rx', 4)
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr('width', d => xScale(d.count || 100));
    
    // Skill names
    bars.append('text')
        .attr('x', 8)
        .attr('y', 18)
        .attr('font-size', '12px')
        .attr('font-weight', '600')
        .attr('fill', '#1e293b')
        .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);
    
    // Demand counts
    bars.append('text')
        .attr('x', width - margin.right)
        .attr('y', 18)
        .attr('text-anchor', 'end')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#6366f1')
        .text(d => (d.count || 100).toLocaleString());
}

window.showSkillNetworkDetails = function(skillNode, links, nodes) {
    console.log('🔍 showSkillNetworkDetails called');
    console.log('  - Skill node:', skillNode);
    console.log('  - Skill name:', skillNode.name);
    console.log('  - Skill count:', skillNode.count);
    
    const relatedJobs = links
        .filter(l => l.target.id === skillNode.id)
        .map(l => nodes.find(n => n.id === l.source.id))
        .filter(n => n);
    
    console.log('  - Related jobs found:', relatedJobs.length);
    console.log('  - Jobs:', relatedJobs.map(j => j.name));
    
    document.querySelector('#network-details').innerHTML = `
        <div style="padding: 24px;">
            <h4 style="color: #1e293b; font-size: 18px; margin-bottom: 8px;">${skillNode.name}</h4>
            <p style="color: #64748b; font-size: 13px; margin-bottom: 16px;">In-Demand Skill</p>
            
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

window.showSkillTimelineDetails = function(skillData) {
    // Track interaction
    if (!interactionTracker.skillLineClicked) {
        interactionTracker.skillLineClicked = true;
        updateInteractionProgress();
        showInteractionFeedback('🚀 Pattern revealed! Check the growth rate on the right.');
    }
    
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

window.scrollToTimeline = function() {
    const timeline = document.getElementById('scroll-section-3');
    if (timeline) {
        timeline.scrollIntoView({ behavior: 'smooth' });
    }
};

// Country filter from map
window.filterByCountry = function(countryName) {
    console.log('🌍 Filtering by country:', countryName);
    window.selectedCountry = countryName;
    
    // Track interaction
    if (!interactionTracker.countryClicked) {
        interactionTracker.countryClicked = true;
        updateInteractionProgress();
        
        // Show success feedback
        showInteractionFeedback('✅ Great! Now scroll down to see how this filters the network graph.');
    }
    
    // Scroll to network section
    const networkSection = document.getElementById('scroll-section-2');
    if (networkSection) {
        setTimeout(() => {
            networkSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
    
    // Filter network graph
    if (appData.aiOpportunities && appData.aiSkills) {
        const countryJobs = appData.aiOpportunities.jobs.filter(j => 
            j.company_location === countryName || 
            j.company_location.includes(countryName) ||
            j.company_location.toLowerCase().includes(countryName.toLowerCase())
        );
        
        console.log(`Found ${countryJobs.length} jobs in ${countryName}`);
        
        if (countryJobs.length > 0) {
            setTimeout(() => {
                viz.createJobSkillNetwork({ jobs: countryJobs }, appData.aiSkills);
                
                // Show notification
                const networkDetails = document.querySelector('#network-details');
                if (networkDetails) {
                    networkDetails.innerHTML = `
                        <div style="padding: 24px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 16px;">🌎</div>
                            <h4 style="color: #1e293b; font-size: 18px; margin-bottom: 12px;">Filtered by ${countryName}</h4>
                            <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">Showing ${countryJobs.length} AI jobs</p>
                            <div style="padding: 12px; background: #f0fdf4; border-radius: 8px; border-left: 3px solid #10b981; margin-bottom: 16px;">
                                <p style="font-size: 13px; color: #065f46;">👆 Click any job node (blue) to see required skills</p>
                            </div>
                            <button onclick="window.clearCountryFilter()" style="padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                                ← Show All Countries
                            </button>
                        </div>
                    `;
                }
            }, 800);
        } else {
            alert(`No AI jobs found in ${countryName}. Try another country!`);
            window.clearCountryFilter();
        }
    }
};

window.clearCountryFilter = function() {
    console.log('✖ Clearing country filter');
    window.selectedCountry = null;
    
    // Clear map selection
    d3.select('#map-filter-title').style('display', 'none');
    d3.selectAll('.country-bubble-scroll')
        .classed('selected', false)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2.5)
        .attr('opacity', 0.85);
    
    // Reset network graph
    if (appData.aiOpportunities && appData.aiSkills) {
        viz.createJobSkillNetwork(appData.aiOpportunities, appData.aiSkills);
        
        // Reset sidebar
        const networkDetails = document.querySelector('#network-details');
        if (networkDetails) {
            networkDetails.innerHTML = `
                <div class="empty-state-compact">
                    <div class="empty-icon">🔍</div>
                    <p>Click any node to explore connections</p>
                </div>
            `;
        }
    }
};

// NEW: Reveal functions for hidden insights
let revealTracker = { education: false, company: false };
window.revealTracker = revealTracker;

window.revealEducation = function() {
    if (window.revealTracker.education) return;
    window.revealTracker.education = true;
    
    const card = document.getElementById('education-card');
    const viz = document.getElementById('education-viz');
    
    card.style.border = '2px solid #fbbf24';
    card.style.background = 'rgba(251,191,36,0.1)';
    card.onclick = null;
    card.style.cursor = 'default';
    
    viz.style.display = 'block';
    
    // Create education ladder visualization
    if (appData.educationData && appData.educationData.education_levels) {
        createEducationLadder(appData.educationData.education_levels);
    } else {
        console.error('Education data not loaded:', appData.educationData);
        viz.innerHTML = '<div style="padding: 20px; color: #ef4444;">Education data not available. Please refresh the page.</div>';
    }
    
    showInteractionFeedback('📚 Education impact revealed! PhD = +150% salary');
    checkBothRevealed();
};

window.revealCompanySize = function() {
    if (window.revealTracker.company) return;
    window.revealTracker.company = true;
    
    const card = document.getElementById('company-card');
    const viz = document.getElementById('company-viz');
    
    card.style.border = '2px solid #8b5cf6';
    card.style.background = 'rgba(139,92,246,0.1)';
    card.onclick = null;
    card.style.cursor = 'default';
    
    viz.style.display = 'block';
    
    // Create company comparison visualization
    if (appData.companyData && appData.companyData.company_sizes) {
        createCompanyComparison(appData.companyData.company_sizes);
    } else {
        console.error('Company data not loaded:', appData.companyData);
        viz.innerHTML = '<div style="padding: 20px; color: #ef4444;">Company data not available. Please refresh the page.</div>';
    }
    
    showInteractionFeedback('🏢 Company size impact revealed! Startups = 2x remote work');
    checkBothRevealed();
};

function checkBothRevealed() {
    if (window.revealTracker.education && window.revealTracker.company) {
        setTimeout(() => {
            const insight = document.getElementById('comparison-insight');
            insight.style.display = 'block';
            insight.style.animation = 'slideInDown 0.8s ease-out';
        }, 500);
    }
}

function createEducationLadder(data) {
    const container = d3.select('#education-viz');
    container.selectAll('*').remove();
    
    if (!data || data.length === 0) {
        console.error('No education data available');
        container.append('div').style('padding', '20px').style('color', '#ef4444')
            .text('Education data not available');
        return;
    }
    
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 80, bottom: 40, left: 80 };
    
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const x = d3.scaleBand()
        .domain(data.map(d => d.education_required))
        .range([margin.left, width - margin.right])
        .padding(0.3);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.avg_salary)])
        .range([height - margin.bottom, margin.top]);
    
    // Bars with click interaction
    svg.selectAll('.edu-bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'edu-bar')
        .attr('x', d => x(d.education_required))
        .attr('y', height - margin.bottom)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', (d, i) => d3.interpolateYlOrRd(i / data.length))
        .attr('rx', 6)
        .attr('stroke', 'transparent')
        .attr('stroke-width', 3)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .attr('stroke', '#fbbf24')
                .attr('stroke-width', 3)
                .style('filter', 'brightness(1.2)');
        })
        .on('mouseout', function(event, d) {
            if (!d3.select(this).classed('selected')) {
                d3.select(this)
                    .attr('stroke', 'transparent')
                    .style('filter', 'none');
            }
        })
        .on('click', function(event, d) {
            // Deselect all
            svg.selectAll('.edu-bar')
                .classed('selected', false)
                .attr('stroke', 'transparent')
                .attr('opacity', 0.3);
            
            // Select this
            d3.select(this)
                .classed('selected', true)
                .attr('stroke', '#fbbf24')
                .attr('stroke-width', 4)
                .attr('opacity', 1);
            
            // Show filtered jobs
            window.filterByEducation(d.education_required, d);
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 150)
        .attr('y', d => y(d.avg_salary))
        .attr('height', d => height - margin.bottom - y(d.avg_salary));
    
    // Labels
    svg.selectAll('.edu-label')
        .data(data)
        .enter()
        .append('text')
        .attr('x', d => x(d.education_required) + x.bandwidth() / 2)
        .attr('y', d => y(d.avg_salary) - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .attr('fill', '#fbbf24')
        .text(d => `$${Math.round(d.avg_salary / 1000)}K`)
        .attr('opacity', 0)
        .transition()
        .duration(800)
        .delay((d, i) => i * 150 + 500)
        .attr('opacity', 1);
    
    // X-axis
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('fill', 'white')
        .attr('font-weight', '600');
    
    // Premium badges
    svg.selectAll('.premium-badge')
        .data(data.filter(d => d.salary_premium > 0))
        .enter()
        .append('text')
        .attr('x', d => x(d.education_required) + x.bandwidth() / 2)
        .attr('y', d => y(d.avg_salary) - 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#10b981')
        .text(d => `+${d.salary_premium}%`)
        .attr('opacity', 0)
        .transition()
        .duration(800)
        .delay((d, i) => i * 150 + 800)
        .attr('opacity', 1);
    
    // Add instruction
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', '#fbbf24')
        .attr('opacity', 0.8)
        .text('👆 Click any bar to see jobs for that education level')
        .attr('opacity', 0)
        .transition()
        .duration(800)
        .delay(1500)
        .attr('opacity', 0.8);
}

// Filter jobs by education
window.filterByEducation = function(education, eduData) {
    console.log('\n📚 ========== EDUCATION FILTER ==========');
    console.log('  - Education level:', education);
    console.log('  - API data for this level:', eduData);
    console.log('  - Total jobs in dataset:', appData.aiOpportunities.jobs.length);
    
    const filteredJobs = appData.aiOpportunities.jobs.filter(j => 
        j.education_required === education || 
        (j.education_required && j.education_required.toLowerCase().includes(education.toLowerCase()))
    );
    
    console.log('  - Jobs found with this education:', filteredJobs.length);
    console.log('  - Sample filtered job:', filteredJobs[0]);
    console.log('  - Salary range in filtered jobs:', 
        Math.min(...filteredJobs.map(j => j.salary_usd)), '-',
        Math.max(...filteredJobs.map(j => j.salary_usd)));
    console.log('=========================================\n');
    
    // Show detail panel
    const detailHtml = `
        <div style="padding: 24px; background: rgba(251,191,36,0.1); border-radius: 12px; margin-top: 20px;">
            <h4 style="color: #fbbf24; font-size: 18px; margin-bottom: 16px;">📚 ${education} Degree Jobs</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.7);">JOBS FOUND</div>
                    <div style="font-size: 24px; font-weight: 700; color: #fbbf24;">${eduData.job_count}</div>
                </div>
                <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.7);">AVG SALARY</div>
                    <div style="font-size: 24px; font-weight: 700; color: #10b981;">$${Math.round(eduData.avg_salary/1000)}K</div>
                </div>
            </div>
            <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px;">
                <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 4px;">REMOTE WORK</div>
                <div style="background: rgba(16,185,129,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: #10b981; height: 100%; width: ${eduData.avg_remote}%; transition: width 1s;"></div>
                </div>
                <div style="font-size: 12px; color: #10b981; margin-top: 4px;">${eduData.avg_remote}% average</div>
            </div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.6;">
                💡 <strong>Insight:</strong> ${education === 'PhD' ? 'Highest salaries but requires 4-7 years extra study' : 
                                                education === 'Master' ? 'Best ROI - 2 years for 40% salary boost' : 
                                                education === 'Bachelor' ? 'Entry point for most AI roles' : 
                                                'Fastest path but limited to junior roles'}
            </div>
            <button onclick="window.clearEducationFilter()" style="width: 100%; margin-top: 16px; padding: 10px; background: rgba(251,191,36,0.2); border: 1px solid #fbbf24; color: #fbbf24; border-radius: 8px; font-weight: 600; cursor: pointer;">
                ← View All Education Levels
            </button>
        </div>
    `;
    
    const container = document.getElementById('education-viz');
    const existingDetail = container.querySelector('.education-detail');
    if (existingDetail) existingDetail.remove();
    
    const detailDiv = document.createElement('div');
    detailDiv.className = 'education-detail';
    detailDiv.innerHTML = detailHtml;
    container.appendChild(detailDiv);
    
    showInteractionFeedback(`📚 ${eduData.job_count} jobs found requiring ${education} degree`);
};

window.clearEducationFilter = function() {
    d3.selectAll('.edu-bar')
        .classed('selected', false)
        .attr('stroke', 'transparent')
        .attr('opacity', 1);
    
    const detail = document.querySelector('.education-detail');
    if (detail) detail.remove();
}

function createCompanyComparison(data) {
    const container = d3.select('#company-viz');
    container.selectAll('*').remove();
    
    if (!data || data.length === 0) {
        console.error('No company data available');
        container.append('div').style('padding', '20px').style('color', '#ef4444')
            .text('Company data not available');
        return;
    }
    
    const width = 500;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };
    
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const x0 = d3.scaleBand()
        .domain(data.map(d => d.company_type))
        .range([margin.left, width - margin.right])
        .padding(0.2);
    
    const x1 = d3.scaleBand()
        .domain(['Salary', 'Remote'])
        .range([0, x0.bandwidth()])
        .padding(0.05);
    
    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height - margin.bottom, margin.top]);
    
    const color = d3.scaleOrdinal()
        .domain(['Salary', 'Remote'])
        .range(['#8b5cf6', '#10b981']);
    
    // Groups
    const groups = svg.selectAll('.company-group')
        .data(data)
        .enter()
        .append('g')
        .attr('transform', d => `translate(${x0(d.company_type)},0)`);
    
    // Make groups clickable
    groups.style('cursor', 'pointer')
        .on('click', function(event, d) {
            // Highlight selected
            svg.selectAll('.company-group').attr('opacity', 0.3);
            d3.select(this).attr('opacity', 1);
            
            window.filterByCompanySize(d);
        });
    
    // Salary bars (normalized to 100)
    groups.append('rect')
        .attr('class', 'salary-bar')
        .attr('x', x1('Salary'))
        .attr('y', height - margin.bottom)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('fill', color('Salary'))
        .attr('rx', 4)
        .transition()
        .duration(1000)
        .attr('y', d => y((d.avg_salary / 200000) * 100))
        .attr('height', d => height - margin.bottom - y((d.avg_salary / 200000) * 100));
    
    // Remote bars
    groups.append('rect')
        .attr('class', 'remote-bar')
        .attr('x', x1('Remote'))
        .attr('y', height - margin.bottom)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('fill', color('Remote'))
        .attr('rx', 4)
        .transition()
        .duration(1000)
        .delay(300)
        .attr('y', d => y(d.remote_percentage))
        .attr('height', d => height - margin.bottom - y(d.remote_percentage));
    
    // X-axis
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x0))
        .selectAll('text')
        .attr('fill', 'white')
        .attr('font-weight', '600');
    
    // Legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 100}, ${margin.top})`);
    
    ['Salary', 'Remote'].forEach((key, i) => {
        const g = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);
        
        g.append('rect')
            .attr('width', 12)
            .attr('height', 12)
            .attr('fill', color(key))
            .attr('rx', 2);
        
        g.append('text')
            .attr('x', 18)
            .attr('y', 10)
            .attr('font-size', '11px')
            .attr('fill', 'white')
            .text(key);
    });
    
    // Add instruction
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', '#8b5cf6')
        .attr('opacity', 0.8)
        .text('👆 Click any company type to see detailed breakdown')
        .attr('opacity', 0)
        .transition()
        .duration(800)
        .delay(1500)
        .attr('opacity', 0.8);
}

// Filter jobs by company size
window.filterByCompanySize = function(companyData) {
    console.log('\n🏢 ========== COMPANY SIZE FILTER ==========');
    console.log('  - Company type:', companyData.company_type);
    console.log('  - API data for this type:', companyData);
    console.log('  - Total jobs in dataset:', appData.aiOpportunities.jobs.length);
    
    // Check how many jobs match this company size in our dataset
    const matchingJobs = appData.aiOpportunities.jobs.filter(j => {
        if (companyData.company_type === 'Startup') return j.company_size === 'S';
        if (companyData.company_type === 'Mid-size') return j.company_size === 'M';
        if (companyData.company_type === 'Large Corp') return j.company_size === 'L';
        return false;
    });
    
    console.log('  - Jobs found with this company size:', matchingJobs.length);
    if (matchingJobs.length > 0) {
        console.log('  - Sample job:', matchingJobs[0]);
        console.log('  - Salary range:', 
            Math.min(...matchingJobs.map(j => j.salary_usd)), '-',
            Math.max(...matchingJobs.map(j => j.salary_usd)));
        console.log('  - Remote %:', 
            (matchingJobs.filter(j => j.remote_ratio === 100).length / matchingJobs.length * 100).toFixed(1));
    }
    console.log('=========================================\n');
    console.log('🏢 Filtering by company:', companyData.company_type);
    
    const detailHtml = `
        <div style="padding: 24px; background: rgba(139,92,246,0.1); border-radius: 12px; margin-top: 20px;">
            <h4 style="color: #8b5cf6; font-size: 18px; margin-bottom: 16px;">🏢 ${companyData.company_type} Companies</h4>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
                <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.7);">JOBS</div>
                    <div style="font-size: 20px; font-weight: 700; color: #8b5cf6;">${companyData.job_count}</div>
                </div>
                <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.7);">SALARY</div>
                    <div style="font-size: 20px; font-weight: 700; color: #10b981;">$${Math.round(companyData.avg_salary/1000)}K</div>
                </div>
                <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.7);">REMOTE</div>
                    <div style="font-size: 20px; font-weight: 700; color: #fbbf24;">${companyData.remote_percentage}%</div>
                </div>
            </div>
            
            <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.7);">Benefits Score</span>
                    <span style="font-size: 12px; font-weight: 700; color: #8b5cf6;">${companyData.avg_benefits}/10</span>
                </div>
                <div style="background: rgba(139,92,246,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: #8b5cf6; height: 100%; width: ${companyData.avg_benefits * 10}%; transition: width 1s;"></div>
                </div>
            </div>
            
            <div style="padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 12px; color: rgba(255,255,255,0.7);">Entry-Level Jobs</span>
                    <span style="font-size: 12px; font-weight: 700; color: #10b981;">${companyData.entry_jobs}</span>
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.6);">Avg Experience: ${companyData.avg_exp_required} years</div>
            </div>
            
            <div style="font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.6; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                💡 <strong>Best For:</strong> ${companyData.company_type === 'Startup' ? 'Risk-takers who want equity, fast growth, and flexibility' : 
                                                    companyData.company_type === 'Mid-size' ? 'Balance seekers - good pay with reasonable work-life balance' : 
                                                    'Stability seekers - highest pay, best benefits, structured career path'}
            </div>
            
            <button onclick="window.clearCompanyFilter()" style="width: 100%; margin-top: 16px; padding: 10px; background: rgba(139,92,246,0.2); border: 1px solid #8b5cf6; color: #8b5cf6; border-radius: 8px; font-weight: 600; cursor: pointer;">
                ← Compare All Company Sizes
            </button>
        </div>
    `;
    
    const container = document.getElementById('company-viz');
    const existingDetail = container.querySelector('.company-detail');
    if (existingDetail) existingDetail.remove();
    
    const detailDiv = document.createElement('div');
    detailDiv.className = 'company-detail';
    detailDiv.innerHTML = detailHtml;
    container.appendChild(detailDiv);
    
    showInteractionFeedback(`🏢 ${companyData.job_count} jobs at ${companyData.company_type} companies`);
};

window.clearCompanyFilter = function() {
    d3.selectAll('.company-group').attr('opacity', 1);
    
    const detail = document.querySelector('.company-detail');
    if (detail) detail.remove();
}

// Automation risk comparison toggle
window.showAutomationComparison = function(type) {
    const highBtn = document.getElementById('toggle-high-risk');
    const lowBtn = document.getElementById('toggle-low-risk');
    const highPanel = document.getElementById('high-risk-panel');
    const lowPanel = document.getElementById('low-risk-panel');
    
    if (type === 'high') {
        // Highlight high risk
        highBtn.style.background = '#ef4444';
        highBtn.style.color = 'white';
        lowBtn.style.background = 'transparent';
        lowBtn.style.color = 'rgba(255,255,255,0.7)';
        
        highPanel.style.opacity = '1';
        highPanel.style.transform = 'scale(1.02)';
        highPanel.style.transition = 'all 0.3s';
        lowPanel.style.opacity = '0.3';
        lowPanel.style.transform = 'scale(0.98)';
        
        showInteractionFeedback('⚠️ 247 occupations at high risk - avg salary $35K');
    } else {
        // Highlight low risk
        lowBtn.style.background = '#10b981';
        lowBtn.style.color = 'white';
        highBtn.style.background = 'transparent';
        highBtn.style.color = 'rgba(255,255,255,0.7)';
        
        lowPanel.style.opacity = '1';
        lowPanel.style.transform = 'scale(1.02)';
        lowPanel.style.transition = 'all 0.3s';
        highPanel.style.opacity = '0.3';
        highPanel.style.transform = 'scale(0.98)';
        
        showInteractionFeedback('✅ 237 occupations at low risk - avg salary $95K');
    }
};

// Make viz globally accessible
window.viz = viz;
