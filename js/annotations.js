// Annotation system for guided discovery
class Annotations {
    constructor() {
        this.annotations = [];
    }

    addAnnotation(vizId, text, x, y, delay = 0) {
        setTimeout(() => {
            const container = d3.select(`#${vizId}`);
            if (container.empty()) return;

            const annotation = container.append('div')
                .style('position', 'absolute')
                .style('left', x + 'px')
                .style('top', y + 'px')
                .style('background', 'rgba(99,102,241,0.95)')
                .style('color', 'white')
                .style('padding', '12px 16px')
                .style('border-radius', '8px')
                .style('font-size', '13px')
                .style('font-weight', '600')
                .style('max-width', '200px')
                .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
                .style('z-index', '1000')
                .style('opacity', '0')
                .style('pointer-events', 'none')
                .html(`<div style="margin-bottom: 4px;">💡</div>${text}`)
                .transition()
                .duration(500)
                .style('opacity', '1');

            // Pulse animation
            setInterval(() => {
                annotation.transition().duration(1000)
                    .style('transform', 'scale(1.05)')
                    .transition().duration(1000)
                    .style('transform', 'scale(1)');
            }, 2000);

            this.annotations.push(annotation);
        }, delay);
    }

    clearAnnotations() {
        this.annotations.forEach(a => a.remove());
        this.annotations = [];
    }
}

window.annotations = new Annotations();
