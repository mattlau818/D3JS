// D3.js Visualization Functions
class Visualizations {
    constructor() {
        this.tooltip = d3.select('#tooltip');
        this.colors = {
            primary: '#6366f1',
            secondary: '#8b5cf6',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            gray: '#64748b'
        };
    }

    createWorldMap(data, metric = 'jobs') {
        const container = d3.select('#world-map');
        container.selectAll('*').remove();
        const width = container.node().getBoundingClientRect().width;
        const height = 500;
        const svg = container.append('svg').attr('width', width).attr('height', height);
        
        // Add background
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', '#f0f4f8');
        
        const projection = d3.geoMercator().scale(width / 6.5).translate([width / 2, height / 1.5]);
        
        const countryCoords = {
            // North America
            'United States': [-95, 38], 'Canada': [-95, 56], 'Mexico': [-102, 23],
            // South America
            'Brazil': [-55, -10], 'Argentina': [-64, -34], 'Chile': [-71, -30], 'Colombia': [-74, 4],
            'Peru': [-76, -10], 'Venezuela': [-66, 8],
            // Western Europe
            'United Kingdom': [-2, 54], 'Germany': [10.5, 51], 'France': [2.5, 47],
            'Spain': [-3.5, 40], 'Italy': [12.5, 42.8], 'Netherlands': [5.3, 52.5],
            'Belgium': [4.5, 50.5], 'Switzerland': [8.2, 46.8], 'Austria': [14, 47.5],
            'Portugal': [-8, 39.5], 'Ireland': [-8, 53], 'Luxembourg': [6.1, 49.8],
            // Northern Europe
            'Sweden': [15, 62], 'Norway': [10, 61], 'Denmark': [10, 56], 'Finland': [26, 64], 'Iceland': [-18, 65],
            // Eastern Europe
            'Poland': [19, 52], 'Czech Republic': [15.5, 49.8], 'Romania': [25, 46],
            'Hungary': [19.5, 47], 'Bulgaria': [25, 43], 'Ukraine': [32, 49],
            'Greece': [22, 39], 'Croatia': [16, 45.5], 'Serbia': [21, 44],
            // Middle East
            'Turkey': [35, 39], 'Israel': [35, 31.5], 'UAE': [54, 24],
            'Saudi Arabia': [45, 24], 'Qatar': [51, 25.5], 'Kuwait': [48, 29.5],
            'Egypt': [31, 27], 'Jordan': [36, 31], 'Lebanon': [36, 34],
            // Asia
            'Russia': [100, 60], 'China': [105, 35], 'Japan': [138, 38],
            'South Korea': [128, 36.5], 'India': [78, 22], 'Singapore': [103.8, 1.3],
            'Malaysia': [101.5, 4], 'Thailand': [101, 15], 'Vietnam': [106, 16],
            'Philippines': [122, 12], 'Indonesia': [118, -2], 'Pakistan': [70, 30],
            'Bangladesh': [90, 24], 'Taiwan': [121, 24], 'Hong Kong': [114.2, 22.3],
            'Sri Lanka': [81, 7],
            // Oceania
            'Australia': [135, -25], 'New Zealand': [174, -41],
            // Africa
            'South Africa': [25, -29], 'Nigeria': [8, 9], 'Kenya': [37.5, 1],
            'Morocco': [-7, 32], 'Ghana': [-1, 8], 'Ethiopia': [39, 9]
        };

        const countries = data.map(([country, stats]) => ({
            name: country,
            coords: countryCoords[country] || [0, 0],
            ...stats
        })).filter(d => d.coords[0] !== 0 && d.ai_jobs && d.avg_salary);

        const maxValue = d3.max(countries, d => {
            const val = metric === 'jobs' ? d.ai_jobs : metric === 'salary' ? d.avg_salary : d.remote_ratio;
            return val || 0;
        }) || 1;
        const sizeScale = d3.scaleSqrt().domain([0, maxValue]).range([4, 20]);
        const colorScale = d3.scaleSequential().domain([0, maxValue]).interpolator(d3.interpolateRgb(this.colors.primary, this.colors.secondary));

        // Draw world map outline
        d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
            const countries_geo = topojson.feature(world, world.objects.countries);
            const path = d3.geoPath().projection(projection);
            
            svg.append('g')
                .selectAll('path')
                .data(countries_geo.features)
                .enter()
                .append('path')
                .each(function(d) {
                    const pathString = path(d);
                    if (pathString && !pathString.includes('NaN')) {
                        d3.select(this).attr('d', pathString);
                    }
                })
                .attr('fill', '#e2e8f0')
                .attr('stroke', '#cbd5e1')
                .attr('stroke-width', 0.5);
            
            // Draw bubbles on top
            svg.selectAll('.country-bubble').data(countries).enter().append('circle')
                .attr('class', 'country-bubble')
                .attr('cx', d => projection(d.coords)[0])
                .attr('cy', d => projection(d.coords)[1])
                .attr('r', 0)
                .attr('fill', d => {
                    const val = metric === 'jobs' ? d.ai_jobs : metric === 'salary' ? d.avg_salary : d.remote_ratio;
                    return colorScale(val || 0);
                })
                .attr('stroke', '#fff').attr('stroke-width', 2.5).attr('opacity', 0.85)
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))')
                .on('mouseover', (event, d) => this.showTooltip(event, d, metric))
                .on('mouseout', () => this.hideTooltip())
                .on('click', (event, d) => {
                    this.selectCountry(d);
                    window.selectedCountry = d.name;
                })
                .transition().duration(800).delay((d, i) => i * 30)
                .attr('r', d => sizeScale(metric === 'jobs' ? d.ai_jobs : metric === 'salary' ? d.avg_salary : d.remote_ratio));
            
            // Add country labels for top 6 countries + ensure Japan, South Korea, Australia are labeled
            const topCountries = countries.filter(d => d.ai_jobs).sort((a, b) => b.ai_jobs - a.ai_jobs).slice(0, 6);
            const mustLabel = ['Japan', 'South Korea', 'Australia'];
            const additionalCountries = countries.filter(d => mustLabel.includes(d.name) && !topCountries.find(t => t.name === d.name));
            const labeledCountries = [...topCountries, ...additionalCountries];
            svg.selectAll('.country-label').data(labeledCountries).enter().append('text')
                .attr('class', 'country-label')
                .attr('x', d => projection(d.coords)[0])
                .attr('y', d => {
                    const val = metric === 'jobs' ? d.ai_jobs : metric === 'salary' ? d.avg_salary : d.remote_ratio;
                    return projection(d.coords)[1] - sizeScale(val || 1) - 6;
                })
                .attr('text-anchor', 'middle')
                .attr('font-size', '11px')
                .attr('font-weight', '700')
                .attr('fill', '#1e293b')
                .style('text-shadow', '1px 1px 3px #fff, -1px -1px 3px #fff')
                .text(d => d.name)
                .attr('opacity', 0)
                .transition().duration(800).attr('opacity', 1);
        });
    }

    createIndustryChart(data) {
        const container = d3.select('#industry-chart');
        container.selectAll('*').remove();
        const width = container.node().getBoundingClientRect().width;
        const height = 400;
        const margin = { top: 20, right: 20, bottom: 100, left: 60 };
        const svg = container.append('svg').attr('width', width).attr('height', height);
        const industries = (data.industries || []).filter(d => d.job_count && d.industry).slice(0, 10);
        if (!industries.length) { 
            console.error('No valid industry data'); 
            container.append('div').style('padding', '60px').style('text-align', 'center').style('color', '#94a3b8').html('<p>No industry data available</p>');
            return; 
        }
        const x = d3.scaleBand().domain(industries.map(d => d.industry)).range([margin.left, width - margin.right]).padding(0.2);
        const y = d3.scaleLinear().domain([0, d3.max(industries, d => d.job_count)]).range([height - margin.bottom, margin.top]);
        const colorScale = d3.scaleSequential().domain([0, industries.length]).interpolator(d3.interpolateRgb(this.colors.primary, this.colors.secondary));

        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).tickSize(-width + margin.left + margin.right).tickFormat(''))
            .style('stroke-dasharray', '2,2')
            .style('opacity', 0.1);
        
        svg.selectAll('.bar').data(industries).enter().append('rect')
            .attr('x', d => x(d.industry)).attr('y', height - margin.bottom).attr('width', x.bandwidth()).attr('height', 0)
            .attr('class', 'bar')
            .attr('fill', (d, i) => colorScale(i)).attr('rx', 6)
            .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
            .on('mouseover', (event, d) => {
                this.tooltip.classed('visible', true).html(`<div class="tooltip-title">${d.industry}</div><div class="tooltip-content">Jobs: ${d.job_count.toLocaleString()}<br>Avg Salary: $${Math.round(d.avg_salary).toLocaleString()}<br>Remote: ${Math.round(d.remote_percentage)}%</div>`)
                    .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', () => this.hideTooltip())
            .transition().duration(800).delay((d, i) => i * 50)
            .attr('y', d => y(d.job_count)).attr('height', d => height - margin.bottom - y(d.job_count));

        // Add value labels on bars
        svg.selectAll('.bar-label').data(industries).enter().append('text')
            .attr('class', 'bar-label')
            .attr('x', d => x(d.industry) + x.bandwidth() / 2)
            .attr('y', d => y(d.job_count) - 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', this.colors.gray)
            .text(d => d.job_count.toLocaleString())
            .attr('opacity', 0)
            .transition().duration(800).delay((d, i) => i * 50).attr('opacity', 1);
        
        svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x))
            .selectAll('text').attr('transform', 'rotate(-45)').style('text-anchor', 'end').attr('font-size', '11px').attr('font-weight', '500');
        svg.append('g').attr('class', 'axis').attr('transform', `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5));
    }

    createScatterPlot(automationData, aiJobsData, filter = 'all') {
        const container = d3.select('#scatter-plot');
        container.selectAll('*').remove();
        const width = container.node().getBoundingClientRect().width;
        const height = 550;
        const margin = { top: 20, right: 160, bottom: 70, left: 70 };
        const svg = container.append('svg').attr('width', width).attr('height', height);

        let plotData = [];
        const jitterAmount = 0.015;
        automationData.occupations.forEach(occ => {
            const avgSalary = (occ.estimated_salary_range[0] + occ.estimated_salary_range[1]) / 2;
            const jitter = (Math.random() - 0.5) * jitterAmount;
            plotData.push({ 
                name: occ.occupation_name, 
                salary: Math.min(avgSalary, 500000), 
                risk: Math.max(0, Math.min(1, occ.automation_probability + jitter)),
                type: 'traditional', 
                riskLevel: occ.risk_category 
            });
        });
        aiJobsData.jobs.slice(0, 100).forEach(job => {
            const jitter = (Math.random() - 0.5) * jitterAmount;
            plotData.push({ 
                name: job.job_title, 
                salary: Math.min(job.salary_usd, 500000), 
                risk: Math.max(0, Math.min(1, 0.1 + jitter)),
                type: 'ai', 
                riskLevel: 'Low Risk', 
                experience: job.experience_label 
            });
        });

        if (filter === 'high-risk') plotData = plotData.filter(d => d.risk >= 0.7);
        else if (filter === 'low-risk') plotData = plotData.filter(d => d.risk < 0.4);
        else if (filter === 'high-salary') plotData = plotData.filter(d => d.salary >= 120000);
        else if (filter === 'ai') plotData = plotData.filter(d => d.type === 'ai');

        // Dynamic Y-axis and X-axis based on filter
        let yDomain = [0, 1];
        let xDomain = [0, 500000];
        if (filter === 'high-risk') yDomain = [0.5, 1];
        else if (filter === 'low-risk') yDomain = [0, 0.45];
        else if (filter === 'high-salary') {
            xDomain = [120000, 500000];
        }
        else if (filter === 'ai') {
            yDomain = [0, 0.3];
            xDomain = [320000, 500000];
        }

        const x = d3.scaleLinear().domain(xDomain).range([margin.left, width - margin.right]);
        const y = d3.scaleLinear().domain(yDomain).range([height - margin.bottom, margin.top]);
        const colorScale = d3.scaleOrdinal()
            .domain(['High Risk', 'Medium Risk', 'Low Risk'])
            .range([this.colors.danger, this.colors.warning, this.colors.success]);

        const gradient = svg.append('defs').append('linearGradient')
            .attr('id', 'bg-gradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', '#f8fafc');
        gradient.append('stop').attr('offset', '100%').attr('stop-color', '#ffffff');
        
        svg.append('rect')
            .attr('x', margin.left).attr('y', margin.top)
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom)
            .attr('fill', 'url(#bg-gradient)').attr('rx', 8);
        
        svg.append('g').attr('class', 'grid').attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(8).tickSize(-height + margin.top + margin.bottom).tickFormat(''))
            .style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3').style('opacity', 0.5);
        svg.append('g').attr('class', 'grid').attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(8).tickSize(-width + margin.left + margin.right).tickFormat(''))
            .style('stroke', '#e2e8f0').style('stroke-dasharray', '3,3').style('opacity', 0.5);

        const dots = svg.selectAll('.job-dot').data(plotData).enter().append('circle').attr('class', 'job-dot')
            .attr('cx', d => x(d.salary)).attr('cy', d => y(d.risk)).attr('r', 0)
            .attr('fill', d => d.type === 'ai' ? this.colors.primary : colorScale(d.riskLevel))
            .attr('stroke', '#fff').attr('stroke-width', 2.5).attr('opacity', 0.75)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.target)
                    .transition().duration(200)
                    .attr('r', 10).attr('opacity', 1).attr('stroke-width', 3)
                    .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))');
                this.tooltip.classed('visible', true)
                    .html(`<div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #fff;">${d.name}</div>
                           <div style="font-size: 13px; line-height: 1.6;">
                               <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                   <span style="opacity: 0.9;">Salary:</span>
                                   <span style="font-weight: 600; color: #10b981;">$${d.salary.toLocaleString()}</span>
                               </div>
                               <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                   <span style="opacity: 0.9;">Risk:</span>
                                   <span style="font-weight: 600; color: #ef4444;">${(d.risk * 100).toFixed(1)}%</span>
                               </div>
                               <div style="display: flex; justify-content: space-between;">
                                   <span style="opacity: 0.9;">Category:</span>
                                   <span style="font-weight: 600;">${d.riskLevel}</span>
                               </div>
                               <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; opacity: 0.8; text-align: center;">Click for details</div>
                           </div>`)
                    .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', (event) => {
                d3.select(event.target)
                    .transition().duration(200)
                    .attr('r', 6).attr('opacity', 0.75).attr('stroke-width', 2.5)
                    .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');
                this.hideTooltip();
            })
            .on('click', (event, d) => {
                event.stopPropagation();
                window.showJobDetails(d);
            })
            .transition().duration(800).delay((d, i) => i * 1.5).attr('r', 6)
            .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');

        const xAxisGroup = svg.append('g').attr('class', 'axis')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(8).tickFormat(d => d === 0 ? '$0' : `$${d/1000}K`));
        xAxisGroup.selectAll('text').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#64748b');
        xAxisGroup.select('.domain').attr('stroke', '#cbd5e1');
        
        const yAxisGroup = svg.append('g').attr('class', 'axis')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format('.0%')));
        yAxisGroup.selectAll('text').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#64748b');
        yAxisGroup.select('.domain').attr('stroke', '#cbd5e1');
        
        // Add filter indicator
        if (filter !== 'all') {
            let zoomText = `🔍 Y: ${yDomain[0] === 0 ? '0' : (yDomain[0]*100).toFixed(0)}%-${(yDomain[1]*100).toFixed(0)}%`;
            if (filter === 'ai') zoomText += ` | X: $${xDomain[0]/1000}K-$${xDomain[1]/1000}K`;
            svg.append('text')
                .attr('x', margin.left + 10).attr('y', margin.top + 15)
                .attr('font-size', '11px').attr('font-weight', '600')
                .attr('fill', '#6366f1').attr('opacity', 0.8)
                .text(zoomText);
        }

        const legend = svg.append('g').attr('transform', `translate(${width - 140}, ${margin.top + 10})`);
        const legendData = [
            {label: 'AI Jobs', color: this.colors.primary}, 
            {label: 'High Risk', color: this.colors.danger}, 
            {label: 'Medium Risk', color: this.colors.warning}, 
            {label: 'Low Risk', color: this.colors.success}
        ];
        legendData.forEach((d, i) => {
            const g = legend.append('g').attr('transform', `translate(0, ${i * 28})`);
            g.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 6)
                .attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 2);
            g.append('text').attr('x', 16).attr('y', 4)
                .attr('font-size', '13px').attr('font-weight', '500').attr('fill', '#475569').text(d.label);
        });
        
        svg.append('text')
            .attr('x', width / 2).attr('y', height - 20)
            .attr('text-anchor', 'middle').attr('font-size', '14px')
            .attr('font-weight', '600').attr('fill', '#475569')
            .text('Annual Salary (USD)');
        svg.append('text')
            .attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', 18)
            .attr('text-anchor', 'middle').attr('font-size', '14px')
            .attr('font-weight', '600').attr('fill', '#475569')
            .text('Automation Risk');
    }

    createRiskDistribution(data) {
        const container = d3.select('#risk-distribution');
        container.selectAll('*').remove();
        const width = container.node().getBoundingClientRect().width;
        const height = 300;
        const riskData = [
            { category: 'High Risk', count: data.risk_summary.high_risk_count, color: this.colors.danger },
            { category: 'Medium Risk', count: data.risk_summary.medium_risk_count, color: this.colors.warning },
            { category: 'Low Risk', count: data.risk_summary.low_risk_count, color: this.colors.success }
        ];
        const svg = container.append('svg').attr('width', width).attr('height', height);
        const radius = Math.min(width, height) / 2 - 20;
        const pie = d3.pie().value(d => d.count).sort(null);
        const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);
        const g = svg.append('g').attr('transform', `translate(${width/2},${height/2})`);

        g.selectAll('.arc').data(pie(riskData)).enter().append('g').attr('class', 'arc').append('path')
            .attr('d', arc).attr('fill', d => d.data.color).attr('stroke', '#fff').attr('stroke-width', 2)
            .on('mouseover', (event, d) => {
                this.tooltip.classed('visible', true).html(`<div class="tooltip-title">${d.data.category}</div><div class="tooltip-content">Occupations: ${d.data.count}</div>`)
                    .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', () => this.hideTooltip())
            .transition().duration(800).attrTween('d', function(d) {
                const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                return t => arc(interpolate(t));
            });

        g.append('text').attr('text-anchor', 'middle').attr('font-size', '36px').attr('font-weight', '800').attr('fill', this.colors.primary).attr('dy', '-0.3em').text(d3.sum(riskData, d => d.count));
        g.append('text').attr('text-anchor', 'middle').attr('font-size', '14px').attr('font-weight', '500').attr('fill', this.colors.gray).attr('dy', '1.3em').text('Occupations');
        
        // Add legend
        const legend = svg.append('g').attr('transform', `translate(20, ${height - 80})`);
        riskData.forEach((d, i) => {
            legend.append('circle').attr('cx', 0).attr('cy', i * 25).attr('r', 6).attr('fill', d.color);
            legend.append('text').attr('x', 15).attr('y', i * 25 + 4).attr('font-size', '12px').attr('font-weight', '500').attr('fill', this.colors.gray).text(`${d.category} (${d.count})`);
        });
    }

    createSkillsChart(aiSkills) {
        const container = d3.select('#skills-chart');
        container.selectAll('*').remove();
        const width = container.node().getBoundingClientRect().width;
        const height = 500;
        const margin = { top: 20, right: 20, bottom: 60, left: 200 };
        const svg = container.append('svg').attr('width', width).attr('height', height);
        const topAI = (Array.isArray(aiSkills) ? aiSkills : []).slice(0, 15);
        if (!topAI.length) { console.error('No skills data'); return; }
        const y = d3.scaleBand().domain(topAI.map(d => d.skill_name || 'Unknown')).range([margin.top, height - margin.bottom]).padding(0.1);
        const x = d3.scaleLinear().domain([0, d3.max(topAI, d => d.count || d.demand_count || 0)]).range([margin.left, width - margin.right]);

        svg.selectAll('.bar-ai').data(topAI).enter().append('rect')
            .attr('x', margin.left).attr('y', d => y(d.skill_name || 'Unknown')).attr('width', 0).attr('height', y.bandwidth())
            .attr('fill', this.colors.primary).attr('rx', 4)
            .style('filter', 'drop-shadow(0 2px 3px rgba(99, 102, 241, 0.3))')
            .on('mouseover', (event, d) => {
                this.tooltip.classed('visible', true).html(`<div class="tooltip-title">${d.skill_name || 'Unknown'}</div><div class="tooltip-content">Demand: ${(d.count || d.demand_count || 0).toLocaleString()} jobs</div>`)
                    .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', () => this.hideTooltip())
            .transition().duration(800).delay((d, i) => i * 40).attr('width', d => x(d.count || d.demand_count || 0) - margin.left);

        svg.selectAll('.label').data(topAI).enter().append('text')
            .attr('x', margin.left - 10).attr('y', d => y(d.skill_name || 'Unknown') + y.bandwidth() / 2)
            .attr('text-anchor', 'end').attr('font-size', '13px').attr('font-weight', '600').attr('fill', this.colors.gray).attr('dy', '0.35em').text(d => d.skill_name || 'Unknown');
        
        // Add value labels
        svg.selectAll('.value-label').data(topAI).enter().append('text')
            .attr('x', d => x(d.count || d.demand_count || 0) + 8)
            .attr('y', d => y(d.skill_name || 'Unknown') + y.bandwidth() / 2)
            .attr('font-size', '12px').attr('font-weight', '600').attr('fill', this.colors.primary).attr('dy', '0.35em')
            .text(d => (d.count || d.demand_count || 0).toLocaleString())
            .attr('opacity', 0).transition().duration(800).delay((d, i) => i * 40).attr('opacity', 1);
        
        svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(5));
        svg.append('text').attr('x', width / 2).attr('y', height - 15).attr('text-anchor', 'middle').attr('font-size', '13px').attr('font-weight', '600').attr('fill', this.colors.gray).text('Number of Job Postings');
    }

    createSkillsSalaryChart(skills) {
        const container = d3.select('#skills-chart');
        container.selectAll('*').remove();
        const width = container.node().getBoundingClientRect().width;
        const height = 500;
        const margin = { top: 20, right: 20, bottom: 60, left: 200 };
        const svg = container.append('svg').attr('width', width).attr('height', height);
        const topSkills = (Array.isArray(skills) ? skills : []).slice(0, 15);
        if (!topSkills.length) { console.error('No salary data'); return; }

        const y = d3.scaleBand().domain(topSkills.map(d => d.skill_name || 'Unknown')).range([margin.top, height - margin.bottom]).padding(0.1);
        const x = d3.scaleLinear().domain([0, d3.max(topSkills, d => d.avg_salary || 0)]).range([margin.left, width - margin.right]);

        svg.selectAll('.bar-salary').data(topSkills).enter().append('rect')
            .attr('x', margin.left).attr('y', d => y(d.skill_name || 'Unknown')).attr('width', 0).attr('height', y.bandwidth())
            .attr('fill', this.colors.success).attr('rx', 4)
            .style('filter', 'drop-shadow(0 2px 3px rgba(16, 185, 129, 0.3))')
            .on('mouseover', (event, d) => {
                this.tooltip.classed('visible', true).html(`<div class="tooltip-title">${d.skill_name || 'Unknown'}</div><div class="tooltip-content">Avg Salary: $${(d.avg_salary || 0).toLocaleString()}<br>Jobs: ${(d.job_count || 0).toLocaleString()}</div>`)
                    .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', () => this.hideTooltip())
            .transition().duration(800).delay((d, i) => i * 40).attr('width', d => x(d.avg_salary || 0) - margin.left);

        svg.selectAll('.label').data(topSkills).enter().append('text')
            .attr('x', margin.left - 10).attr('y', d => y(d.skill_name || 'Unknown') + y.bandwidth() / 2)
            .attr('text-anchor', 'end').attr('font-size', '13px').attr('font-weight', '600').attr('fill', this.colors.gray).attr('dy', '0.35em').text(d => d.skill_name || 'Unknown');
        
        svg.selectAll('.value-label').data(topSkills).enter().append('text')
            .attr('x', d => x(d.avg_salary || 0) + 8)
            .attr('y', d => y(d.skill_name || 'Unknown') + y.bandwidth() / 2)
            .attr('font-size', '12px').attr('font-weight', '600').attr('fill', this.colors.success).attr('dy', '0.35em')
            .text(d => `$${Math.round((d.avg_salary || 0) / 1000)}K`)
            .attr('opacity', 0).transition().duration(800).delay((d, i) => i * 40).attr('opacity', 1);
        
        svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickFormat(d => `$${d/1000}K`));
        svg.append('text').attr('x', width / 2).attr('y', height - 15).attr('text-anchor', 'middle').attr('font-size', '13px').attr('font-weight', '600').attr('fill', this.colors.gray).text('Average Salary (USD)');
    }

    showTooltip(event, data, metric) {
        let content = `<div class="tooltip-title">${data.name}</div><div class="tooltip-content">`;
        if (metric === 'jobs') content += `AI Jobs: ${data.ai_jobs?.toLocaleString() || 0}<br>Avg Salary: $${data.avg_salary?.toLocaleString() || 0}<br>Remote: ${data.remote_ratio || 0}%`;
        else if (metric === 'salary') content += `Avg Salary: $${data.avg_salary?.toLocaleString() || 0}<br>AI Jobs: ${data.ai_jobs?.toLocaleString() || 0}`;
        else content += `Remote Work: ${data.remote_ratio || 0}%<br>AI Jobs: ${data.ai_jobs?.toLocaleString() || 0}`;
        content += '</div>';
        this.tooltip.classed('visible', true).html(content).style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 10) + 'px');
    }

    hideTooltip() {
        this.tooltip.classed('visible', false);
    }

    selectCountry(country) {
        d3.selectAll('.country-bubble').classed('selected', false);
        d3.selectAll('.country-bubble').filter(d => d.name === country.name).classed('selected', true);
        d3.select('#country-details').html(`
            <div class="detail-item"><span class="detail-label">Country</span><span class="detail-value highlight">${country.name}</span></div>
            <div class="detail-item"><span class="detail-label">AI Jobs</span><span class="detail-value">${country.ai_jobs?.toLocaleString() || 0}</span></div>
            <div class="detail-item"><span class="detail-label">Average Salary</span><span class="detail-value">$${country.avg_salary?.toLocaleString() || 0}</span></div>
            <div class="detail-item"><span class="detail-label">Remote Work</span><span class="detail-value">${country.remote_ratio || 0}%</span></div>
            <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button onclick="window.filterByCountry('${country.name}')" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;">🔍 Explore Jobs</button>
                <button onclick="window.resetFilters()" style="padding: 10px 16px; background: #e2e8f0; color: #475569; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;">↺</button>
            </div>
        `);
    }

    // NEW: Job-Skill Network Graph (Replaces bubble chart)
    createJobSkillNetwork(jobsData, skillsData) {
        console.log('\n🕸️ ========== CREATING NETWORK GRAPH ==========');
        console.log('📊 Input data:');
        console.log('  - Total jobs available:', jobsData.jobs?.length);
        console.log('  - Total skills available:', skillsData?.length);
        console.log('  - Sample job:', jobsData.jobs?.[0]);
        console.log('  - Sample skill:', skillsData?.[0]);
        
        const container = d3.select('#network-graph');
        if (container.empty()) {
            console.error('❌ Network graph container not found');
            return;
        }
        container.selectAll('*').remove();
        
        const width = container.node().getBoundingClientRect().width || 800;
        const height = 600;
        const svg = container.append('svg').attr('width', width).attr('height', height);
        
        // Add background
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#fafafa');
        
        // Prepare network data - take random sample to show variety
        const shuffled = jobsData.jobs.sort(() => 0.5 - Math.random());
        const jobs = shuffled.slice(0, 15).map((j, i) => ({
            id: `job-${i}`,
            name: j.job_title,
            type: 'job',
            salary: j.salary_usd,
            jobData: j
        }));
        
        const skillMap = new Map();
        const topSkills = skillsData.slice(0, 20);
        topSkills.forEach((s, i) => {
            if (!skillMap.has(s.skill_name)) {
                skillMap.set(s.skill_name, {
                    id: `skill-${i}`,
                    name: s.skill_name,
                    type: 'skill',
                    count: s.count || s.demand_count || 0
                });
            }
        });
        const skills = Array.from(skillMap.values());
        
        // Create links - connect each job to 3-5 skills (deterministic)
        const links = [];
        jobs.forEach((job, jobIdx) => {
            const numSkills = 3 + (jobIdx % 3);
            const startIdx = (jobIdx * 3) % skills.length;
            for (let i = 0; i < numSkills; i++) {
                const skillIdx = (startIdx + i) % skills.length;
                links.push({ source: job.id, target: skills[skillIdx].id });
            }
        });
        
        const nodes = [...jobs, ...skills];
        
        console.log('🎯 Network composition:');
        console.log('  - Jobs in network:', jobs.length);
        console.log('  - Skills in network:', skills.length);
        console.log('  - Total links:', links.length);
        console.log('  - Sample job node:', jobs[0]);
        console.log('  - Sample skill node:', skills[0]);
        console.log('  - Job locations:', jobs.map(j => j.jobData?.company_location).filter((v, i, a) => a.indexOf(v) === i));
        console.log('  - Job salaries range:', Math.min(...jobs.map(j => j.salary)), '-', Math.max(...jobs.map(j => j.salary)));
        console.log('=========================================\n');
        
        // Force simulation with boundary constraints
        const padding = 40;
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => d.type === 'job' ? 30 : 20))
            .force('x', d3.forceX(width / 2).strength(0.1))
            .force('y', d3.forceY(height / 2).strength(0.1));
        
        // Draw links
        const link = svg.append('g').selectAll('line').data(links).enter().append('line')
            .attr('stroke', '#cbd5e1').attr('stroke-width', 1.5).attr('opacity', 0.4);
        
        // Draw nodes
        const node = svg.append('g').selectAll('g').data(nodes).enter().append('g')
            .attr('class', 'network-node')
            .call(d3.drag()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x; d.fy = d.y;
                })
                .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null; d.fy = null;
                }));
        
        node.append('circle')
            .attr('r', d => d.type === 'job' ? 20 : 12)
            .attr('fill', d => d.type === 'job' ? this.colors.primary : this.colors.success)
            .attr('stroke', '#fff').attr('stroke-width', 2.5)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.target).transition().duration(200)
                    .attr('r', d.type === 'job' ? 28 : 18)
                    .style('filter', 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))');
                
                // Highlight connected nodes
                const connectedIds = new Set();
                links.forEach(l => {
                    if (l.source.id === d.id) connectedIds.add(l.target.id);
                    if (l.target.id === d.id) connectedIds.add(l.source.id);
                });
                
                node.selectAll('circle').attr('opacity', n => connectedIds.has(n.id) || n.id === d.id ? 1 : 0.2);
                link.attr('opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 0.8 : 0.1)
                    .attr('stroke', l => (l.source.id === d.id || l.target.id === d.id) ? this.colors.primary : '#cbd5e1');
                
                this.tooltip.classed('visible', true)
                    .html(`<div style="font-weight: 700; font-size: 14px; margin-bottom: 8px;">${d.name}</div>
                           <div style="font-size: 13px;">${d.type === 'job' ? `Salary: $${d.salary?.toLocaleString()}` : `Demand: ${d.count?.toLocaleString()} jobs`}</div>
                           <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">Click to explore ${d.type === 'job' ? 'required skills' : 'related jobs'}</div>`)
                    .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', (event, d) => {
                d3.select(event.target).transition().duration(200)
                    .attr('r', d.type === 'job' ? 20 : 12)
                    .style('filter', 'none');
                node.selectAll('circle').attr('opacity', 1);
                link.attr('opacity', 0.4).attr('stroke', '#cbd5e1');
                this.hideTooltip();
            })
            .on('click', (event, d) => {
                event.stopPropagation();
                console.log('🔵 Node clicked:', d.type);
                console.log('📊 Full node data:', d);
                console.log('🔗 Total links:', links.length);
                console.log('🎯 Total nodes:', nodes.length);
                
                if (d.type === 'job') {
                    console.log('💼 JOB NODE CLICKED');
                    console.log('  - Job ID:', d.jobData?.job_id);
                    console.log('  - Title:', d.name);
                    console.log('  - Salary:', d.salary);
                    console.log('  - Location:', d.jobData?.company_location);
                    console.log('  - Experience:', d.jobData?.experience_level);
                    console.log('  - Industry:', d.jobData?.industry);
                    console.log('  - Raw job data:', d.jobData);
                    window.showJobNetworkDetails(d, links, nodes);
                } else {
                    console.log('🟢 SKILL NODE CLICKED');
                    console.log('  - Skill name:', d.name);
                    console.log('  - Demand count:', d.count);
                    console.log('  - Node ID:', d.id);
                    window.showSkillNetworkDetails(d, links, nodes);
                }
            });
        
        node.append('text')
            .attr('dy', d => d.type === 'job' ? 32 : 22)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px').attr('font-weight', '600')
            .attr('fill', this.colors.gray)
            .style('pointer-events', 'none')
            .text(d => {
                const maxLen = d.type === 'job' ? 15 : 12;
                return d.name.length > maxLen ? d.name.substring(0, maxLen) + '...' : d.name;
            });
        
        simulation.on('tick', () => {
            // Constrain nodes within bounds
            nodes.forEach(d => {
                d.x = Math.max(padding, Math.min(width - padding, d.x));
                d.y = Math.max(padding, Math.min(height - padding, d.y));
            });
            
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
        
        // Add legend
        const legend = svg.append('g').attr('transform', `translate(20, 20)`);
        legend.append('circle').attr('cx', 0).attr('cy', 0).attr('r', 10).attr('fill', this.colors.primary).attr('stroke', '#fff').attr('stroke-width', 2);
        legend.append('text').attr('x', 20).attr('y', 5).attr('font-size', '13px').attr('font-weight', '600').text('Jobs');
        legend.append('circle').attr('cx', 0).attr('cy', 30).attr('r', 8).attr('fill', this.colors.success).attr('stroke', '#fff').attr('stroke-width', 2);
        legend.append('text').attr('x', 20).attr('y', 35).attr('font-size', '13px').attr('font-weight', '600').text('Skills');
        
        // Add instruction text
        svg.append('text')
            .attr('x', width / 2).attr('y', height - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px').attr('fill', this.colors.gray).attr('opacity', 0.7)
            .text('💡 Click nodes to explore • Drag to rearrange');
    }

    // NEW: Skill Timeline Visualization
    createSkillTimeline(skillsData) {
        const container = d3.select('#skill-timeline');
        if (container.empty()) {
            console.error('Timeline container not found');
            return;
        }
        container.selectAll('*').remove();
        
        const width = container.node().getBoundingClientRect().width || 800;
        const height = 500;
        const margin = { top: 40, right: 120, bottom: 60, left: 60 };
        const svg = container.append('svg').attr('width', width).attr('height', height);
        
        // Add background
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#fafafa');
        
        // Simulate timeline data (in real scenario, you'd have temporal data)
        const topSkills = skillsData.slice(0, 8);
        const timePoints = ['2020', '2021', '2022', '2023', '2024'];
        
        const timelineData = topSkills.map(skill => {
            const baseValue = (skill.count || skill.demand_count || 100);
            return {
                name: skill.skill_name,
                values: timePoints.map((year, i) => ({
                    year,
                    demand: baseValue * (0.6 + i * 0.2 + Math.random() * 0.15)
                }))
            };
        });
        
        console.log('Timeline data:', timelineData);
        
        const x = d3.scalePoint().domain(timePoints).range([margin.left, width - margin.right]).padding(0.5);
        const y = d3.scaleLinear()
            .domain([0, d3.max(timelineData, d => d3.max(d.values, v => v.demand))])
            .range([height - margin.bottom, margin.top]);
        const colorScale = d3.scaleOrdinal()
            .domain(topSkills.map(s => s.skill_name))
            .range(d3.schemeTableau10);
        
        // Add chart background
        svg.append('rect')
            .attr('x', margin.left).attr('y', margin.top)
            .attr('width', width - margin.left - margin.right)
            .attr('height', height - margin.top - margin.bottom)
            .attr('fill', 'white').attr('rx', 8);
        
        // Grid
        svg.append('g').attr('class', 'grid')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).tickSize(-width + margin.left + margin.right).tickFormat(''))
            .style('stroke', '#e2e8f0').style('stroke-dasharray', '2,2').style('opacity', 0.5);
        
        // Lines
        const line = d3.line()
            .x(d => x(d.year))
            .y(d => y(d.demand))
            .curve(d3.curveMonotoneX);
        
        const paths = svg.append('g').selectAll('path').data(timelineData).enter();
        
        paths.append('path')
            .attr('fill', 'none')
            .attr('stroke', d => colorScale(d.name))
            .attr('stroke-width', 3)
            .attr('d', d => line(d.values))
            .style('opacity', 0.7)
            .style('cursor', 'pointer')
            .on('mouseover', (event, d) => {
                d3.select(event.target).attr('stroke-width', 5).style('opacity', 1);
                svg.selectAll('path').filter(p => p !== d).style('opacity', 0.2);
                this.tooltip.classed('visible', true)
                    .html(`<div style="font-weight: 700; font-size: 14px; margin-bottom: 8px;">${d.name}</div>
                           <div style="font-size: 12px;">Growth: ${((d.values[4].demand / d.values[0].demand - 1) * 100).toFixed(0)}%</div>`)
                    .style('left', (event.pageX + 15) + 'px').style('top', (event.pageY - 15) + 'px');
            })
            .on('mouseout', (event, d) => {
                d3.select(event.target).attr('stroke-width', 3).style('opacity', 0.7);
                svg.selectAll('path').style('opacity', 0.7);
                this.hideTooltip();
            })
            .on('click', (event, d) => {
                window.showSkillTimelineDetails(d);
            });
        
        // Points
        timelineData.forEach(skill => {
            svg.selectAll(`.point-${skill.name.replace(/\s+/g, '-')}`)
                .data(skill.values).enter().append('circle')
                .attr('cx', d => x(d.year))
                .attr('cy', d => y(d.demand))
                .attr('r', 5)
                .attr('fill', colorScale(skill.name))
                .attr('stroke', '#fff').attr('stroke-width', 2)
                .style('cursor', 'pointer')
                .on('mouseover', (event, d) => {
                    d3.select(event.target).attr('r', 8);
                })
                .on('mouseout', (event, d) => {
                    d3.select(event.target).attr('r', 5);
                });
        });
        
        // Axes
        const xAxis = svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x));
        xAxis.selectAll('text').attr('font-size', '12px').attr('font-weight', '600').attr('fill', '#475569');
        xAxis.select('.domain').attr('stroke', '#cbd5e1');
        
        const yAxis = svg.append('g').attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).tickFormat(d => Math.round(d/1000) + 'K'));
        yAxis.selectAll('text').attr('font-size', '12px').attr('font-weight', '500').attr('fill', '#475569');
        yAxis.select('.domain').attr('stroke', '#cbd5e1');
        
        // Axis labels
        svg.append('text')
            .attr('x', width / 2).attr('y', height - 15)
            .attr('text-anchor', 'middle').attr('font-size', '13px').attr('font-weight', '600')
            .attr('fill', '#475569').text('Year');
        
        svg.append('text')
            .attr('transform', 'rotate(-90)').attr('x', -height / 2).attr('y', 20)
            .attr('text-anchor', 'middle').attr('font-size', '13px').attr('font-weight', '600')
            .attr('fill', '#475569').text('Job Demand');
        
        // Legend
        const legend = svg.append('g').attr('transform', `translate(${width - 110}, ${margin.top})`);
        timelineData.forEach((d, i) => {
            const g = legend.append('g').attr('transform', `translate(0, ${i * 22})`)
                .style('cursor', 'pointer')
                .on('click', () => {
                    window.showSkillTimelineDetails(d);
                });
            g.append('line').attr('x1', 0).attr('x2', 20).attr('y1', 0).attr('y2', 0)
                .attr('stroke', colorScale(d.name)).attr('stroke-width', 3);
            g.append('text').attr('x', 25).attr('y', 4).attr('font-size', '11px').attr('font-weight', '500')
                .attr('fill', '#475569')
                .text(d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name);
        });
        
        // Add instruction
        svg.append('text')
            .attr('x', width / 2).attr('y', height - 5)
            .attr('text-anchor', 'middle').attr('font-size', '11px')
            .attr('fill', this.colors.gray).attr('opacity', 0.7)
            .text('💡 Click any line or legend item to see growth details');
    }

    // Animation helper for global transition
    animateGlobalTransition() {
        const map = d3.select('#world-map svg');
        if (!map.empty()) {
            map.transition().duration(1000)
                .style('transform', 'scale(1.05)')
                .transition().duration(1000)
                .style('transform', 'scale(1)');
        }
    }

    // Scroll-specific world map WITH click interactions
    createWorldMapScroll(data, metric = 'jobs') {
        const container = d3.select('#world-map-scroll');
        if (container.empty()) return;
        container.selectAll('*').remove();
        
        // Add title showing current filter
        const filterTitle = container.append('div')
            .attr('id', 'map-filter-title')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('left', '50%')
            .style('transform', 'translateX(-50%)')
            .style('background', 'rgba(99,102,241,0.9)')
            .style('color', 'white')
            .style('padding', '8px 16px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('display', 'none')
            .style('z-index', '100');
        
        const width = container.node().getBoundingClientRect().width;
        const height = 700;
        const svg = container.append('svg').attr('width', width).attr('height', height);
        
        svg.append('rect').attr('width', width).attr('height', height).attr('fill', '#f0f4f8');
        
        const projection = d3.geoMercator().scale(width / 6.5).translate([width / 2, height / 1.5]);
        
        const countryCoords = {
            // North America
            'United States': [-95, 38], 'Canada': [-95, 56], 'Mexico': [-102, 23],
            // South America
            'Brazil': [-55, -10], 'Argentina': [-64, -34], 'Chile': [-71, -30], 'Colombia': [-74, 4],
            'Peru': [-76, -10], 'Venezuela': [-66, 8],
            // Western Europe
            'United Kingdom': [-2, 54], 'Germany': [10.5, 51], 'France': [2.5, 47],
            'Spain': [-3.5, 40], 'Italy': [12.5, 42.8], 'Netherlands': [5.3, 52.5],
            'Belgium': [4.5, 50.5], 'Switzerland': [8.2, 46.8], 'Austria': [14, 47.5],
            'Portugal': [-8, 39.5], 'Ireland': [-8, 53], 'Luxembourg': [6.1, 49.8],
            // Northern Europe
            'Sweden': [15, 62], 'Norway': [10, 61], 'Denmark': [10, 56], 'Finland': [26, 64], 'Iceland': [-18, 65],
            // Eastern Europe
            'Poland': [19, 52], 'Czech Republic': [15.5, 49.8], 'Romania': [25, 46],
            'Hungary': [19.5, 47], 'Bulgaria': [25, 43], 'Ukraine': [32, 49],
            'Greece': [22, 39], 'Croatia': [16, 45.5], 'Serbia': [21, 44],
            // Middle East
            'Turkey': [35, 39], 'Israel': [35, 31.5], 'UAE': [54, 24],
            'Saudi Arabia': [45, 24], 'Qatar': [51, 25.5], 'Kuwait': [48, 29.5],
            'Egypt': [31, 27], 'Jordan': [36, 31], 'Lebanon': [36, 34],
            // Asia
            'Russia': [100, 60], 'China': [105, 35], 'Japan': [138, 38],
            'South Korea': [128, 36.5], 'India': [78, 22], 'Singapore': [103.8, 1.3],
            'Malaysia': [101.5, 4], 'Thailand': [101, 15], 'Vietnam': [106, 16],
            'Philippines': [122, 12], 'Indonesia': [118, -2], 'Pakistan': [70, 30],
            'Bangladesh': [90, 24], 'Taiwan': [121, 24], 'Hong Kong': [114.2, 22.3],
            'Sri Lanka': [81, 7],
            // Oceania
            'Australia': [135, -25], 'New Zealand': [174, -41],
            // Africa
            'South Africa': [25, -29], 'Nigeria': [8, 9], 'Kenya': [37.5, 1],
            'Morocco': [-7, 32], 'Ghana': [-1, 8], 'Ethiopia': [39, 9]
        };

        const countries = data.map(([country, stats]) => ({
            name: country,
            coords: countryCoords[country] || [0, 0],
            ...stats
        })).filter(d => d.coords[0] !== 0 && d.ai_jobs && d.avg_salary);

        const maxValue = d3.max(countries, d => {
            const val = metric === 'jobs' ? d.ai_jobs : metric === 'salary' ? d.avg_salary : d.remote_ratio;
            return val || 0;
        }) || 1;
        
        const sizeScale = d3.scaleSqrt().domain([0, maxValue]).range([4, 18]);
        const colorScale = d3.scaleSequential()
            .domain([0, maxValue])
            .interpolator(d3.interpolateRgb(this.colors.primary, this.colors.secondary));

        // Draw world map
        d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(world => {
            const countries_geo = topojson.feature(world, world.objects.countries);
            const path = d3.geoPath().projection(projection);
            
            svg.append('g').selectAll('path').data(countries_geo.features).enter().append('path')
                .each(function(d) {
                    const pathString = path(d);
                    if (pathString && !pathString.includes('NaN')) {
                        d3.select(this).attr('d', pathString);
                    }
                })
                .attr('fill', '#e2e8f0').attr('stroke', '#cbd5e1').attr('stroke-width', 0.5);
            
            // Update or create bubbles WITH CLICK INTERACTION
            const bubbles = svg.selectAll('.country-bubble-scroll').data(countries, d => d.name);
            
            // Exit
            bubbles.exit().transition().duration(500).attr('r', 0).remove();
            
            // Enter + Update
            const bubblesEnter = bubbles.enter().append('circle')
                .attr('class', 'country-bubble-scroll')
                .attr('cx', d => projection(d.coords)[0])
                .attr('cy', d => projection(d.coords)[1])
                .attr('r', 0)
                .attr('stroke', '#fff').attr('stroke-width', 2.5)
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))')
                .style('cursor', 'pointer');
            
            // Merge and add interactions
            const bubblesUpdate = bubblesEnter.merge(bubbles);
            
            // Add interactions BEFORE transition
            bubblesUpdate
                .on('mouseover', function(event, d) {
                    d3.select(this)
                        .transition().duration(200)
                        .attr('stroke-width', 4)
                        .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))');
                    
                    // Show tooltip with country name
                    const tooltip = d3.select('#tooltip');
                    const metricLabel = metric === 'jobs' ? 'AI Jobs' : metric === 'salary' ? 'Avg Salary' : 'Remote %';
                    const metricValue = metric === 'jobs' ? d.ai_jobs?.toLocaleString() : 
                                       metric === 'salary' ? '$' + d.avg_salary?.toLocaleString() : 
                                       d.remote_ratio + '%';
                    
                    tooltip.classed('visible', true)
                        .html(`<div style="font-weight: 700; font-size: 16px; margin-bottom: 8px; color: #6366f1;">${d.name}</div>
                               <div style="font-size: 14px; margin-bottom: 4px;">
                                   <strong>${metricLabel}:</strong> ${metricValue}
                               </div>
                               <div style="font-size: 12px; color: #64748b;">
                                   Jobs: ${d.ai_jobs?.toLocaleString()} | 
                                   Salary: $${Math.round(d.avg_salary/1000)}K | 
                                   Remote: ${d.remote_ratio}%
                               </div>
                               <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; opacity: 0.8; text-align: center;">👆 Click to filter all visualizations</div>`)
                        .style('left', (event.pageX + 15) + 'px')
                        .style('top', (event.pageY - 15) + 'px');
                })
                .on('mouseout', function(event, d) {
                    if (!d3.select(this).classed('selected')) {
                        d3.select(this)
                            .transition().duration(200)
                            .attr('stroke-width', 2.5)
                            .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
                    }
                    d3.select('#tooltip').classed('visible', false);
                })
                .on('click', function(event, d) {
                    event.stopPropagation();
                    console.log('Clicked country:', d.name);
                    
                    // Toggle selection
                    const isSelected = d3.select(this).classed('selected');
                    
                    if (isSelected) {
                        // Deselect
                        svg.selectAll('.country-bubble-scroll')
                            .classed('selected', false)
                            .attr('stroke', '#fff')
                            .attr('stroke-width', 2.5)
                            .attr('opacity', 0.85);
                        d3.select('#map-filter-title').style('display', 'none');
                        if (window.clearCountryFilter) window.clearCountryFilter();
                    } else {
                        // Select this country
                        svg.selectAll('.country-bubble-scroll')
                            .classed('selected', false)
                            .attr('stroke', '#fff')
                            .attr('stroke-width', 2.5)
                            .attr('opacity', 0.3);
                        
                        d3.select(this)
                            .classed('selected', true)
                            .attr('stroke', '#fbbf24')
                            .attr('stroke-width', 4)
                            .attr('opacity', 1);
                        
                        // Show filter title
                        d3.select('#map-filter-title')
                            .style('display', 'block')
                            .html(`🌎 Filtering by: <strong>${d.name}</strong> • <span style="cursor: pointer; text-decoration: underline;" onclick="window.clearCountryFilter()">Clear Filter</span>`);
                        
                        // Trigger filter on other visualizations
                        if (window.filterByCountry) {
                            window.filterByCountry(d.name);
                        }
                    }
                });
            
            // Animate size and color
            bubblesUpdate
                .transition().duration(800)
                .attr('r', d => {
                    const val = metric === 'jobs' ? d.ai_jobs : metric === 'salary' ? d.avg_salary : d.remote_ratio;
                    return sizeScale(val || 0);
                })
                .attr('fill', d => {
                    const val = metric === 'jobs' ? d.ai_jobs : metric === 'salary' ? d.avg_salary : d.remote_ratio;
                    return colorScale(val || 0);
                });
            
            // Smart labeling - show top countries + Japan, South Korea, Australia
            const topByJobs = countries
                .filter(d => d.ai_jobs > 200)
                .sort((a, b) => b.ai_jobs - a.ai_jobs)
                .slice(0, 12);
            const mustShow = ['Japan', 'South Korea', 'Australia'];
            const additional = countries.filter(d => mustShow.includes(d.name) && !topByJobs.find(t => t.name === d.name));
            const labeledCountries = [...topByJobs, ...additional];
            
            const labels = svg.selectAll('.country-label-scroll').data(labeledCountries, d => d.name);
            
            labels.exit().transition().duration(500).attr('opacity', 0).remove();
            
            const labelsEnter = labels.enter().append('g')
                .attr('class', 'country-label-scroll')
                .style('pointer-events', 'none');
            
            // Add background rect for readability
            labelsEnter.append('rect')
                .attr('fill', 'rgba(255,255,255,0.95)')
                .attr('stroke', '#cbd5e1')
                .attr('stroke-width', 1)
                .attr('rx', 6)
                .style('box-shadow', '0 2px 4px rgba(0,0,0,0.1)');
            
            labelsEnter.append('text')
                .attr('text-anchor', 'middle')
                .attr('font-size', '11px')
                .attr('font-weight', '700')
                .attr('fill', '#1e293b')
                .text(d => {
                    const shortNames = {
                        'United States': 'USA',
                        'United Kingdom': 'UK',
                        'South Korea': 'S. Korea',
                        'South Africa': 'S. Africa',
                        'Saudi Arabia': 'Saudi',
                        'New Zealand': 'NZ',
                        'Japan': 'Japan',
                        'Australia': 'Australia'
                    };
                    return shortNames[d.name] || d.name;
                });
            
            const labelsUpdate = labelsEnter.merge(labels);
            
            labelsUpdate.transition().duration(800)
                .attr('transform', d => {
                    const val = metric === 'jobs' ? d.ai_jobs : metric === 'salary' ? d.avg_salary : d.remote_ratio;
                    const x = projection(d.coords)[0];
                    const y = projection(d.coords)[1] - sizeScale(val || 1) - 12;
                    return `translate(${x},${y})`;
                })
                .attr('opacity', d => d.ai_jobs > 1000 ? 1 : 0.85);
            
            // Update rect size based on text
            labelsUpdate.select('text').each(function() {
                const bbox = this.getBBox();
                d3.select(this.parentNode).select('rect')
                    .attr('x', bbox.x - 6)
                    .attr('y', bbox.y - 3)
                    .attr('width', bbox.width + 12)
                    .attr('height', bbox.height + 6);
            });
            
            // Add instruction text
            svg.append('text')
                .attr('x', width / 2)
                .attr('y', 30)
                .attr('text-anchor', 'middle')
                .attr('font-size', '14px')
                .attr('font-weight', '600')
                .attr('fill', '#6366f1')
                .style('text-shadow', '1px 1px 2px white, -1px -1px 2px white')
                .text('👇 Hover to see details • Click to filter');
            
            // Add legend for unlabeled countries
            const legend = svg.append('g')
                .attr('transform', `translate(20, ${height - 60})`);
            
            legend.append('rect')
                .attr('width', 200)
                .attr('height', 50)
                .attr('fill', 'rgba(255,255,255,0.95)')
                .attr('stroke', '#cbd5e1')
                .attr('rx', 8);
            
            legend.append('text')
                .attr('x', 10)
                .attr('y', 20)
                .attr('font-size', '11px')
                .attr('font-weight', '600')
                .attr('fill', '#64748b')
                .text('💡 Tip: Hover any bubble');
            
            legend.append('text')
                .attr('x', 10)
                .attr('y', 38)
                .attr('font-size', '10px')
                .attr('fill', '#64748b')
                .text('to see country name & data');
        });
    }
}
