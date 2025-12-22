// assets/dashboard-animations.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard particles
    initDashboardParticles();
    
    // Initialize animated stats
    initAnimatedStats();
    
    // Initialize scroll animations
    initScrollAnimations();
    
    // Add hover effects to cards
    initCardAnimations();
    
    // Initialize color changing animation
    initColorAnimation();
});

// Particle System for Dashboard
function initDashboardParticles() {
    const container = document.getElementById('dashboardParticles');
    if (!container) return;
    
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';
    container.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    let particles = [];
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    function createParticles() {
        particles = [];
        const particleCount = Math.floor((canvas.width * canvas.height) / 20000);
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                color: `rgba(${Math.floor(Math.random() * 100 + 155)}, 
                        ${Math.floor(Math.random() * 100)}, 
                        ${Math.floor(Math.random() * 100 + 155)}, 
                        ${Math.random() * 0.3 + 0.1})`,
                waveOffset: Math.random() * Math.PI * 2
            });
        }
    }
    
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw connections between particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(155, 92, 255, ${(1 - distance/100) * 0.1})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        
        // Update and draw particles
        const now = Date.now();
        particles.forEach(particle => {
            // Add wave motion
            particle.x += particle.speedX + Math.sin(now * 0.001 + particle.waveOffset) * 0.2;
            particle.y += particle.speedY + Math.cos(now * 0.001 + particle.waveOffset) * 0.2;
            
            // Bounce off walls
            if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;
            
            // Draw particle
            ctx.beginPath();
            ctx.fillStyle = particle.color;
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Add glow effect
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = particle.color.replace(')', ', 0.1)').replace('rgb', 'rgba');
            ctx.fill();
        });
        
        requestAnimationFrame(animateParticles);
    }
    
    resizeCanvas();
    createParticles();
    animateParticles();
    
    window.addEventListener('resize', () => {
        resizeCanvas();
        createParticles();
    });
}

// Animated Statistics
function initAnimatedStats() {
    const stats = {
        activeUsers: { target: 1250, current: 0, speed: 20 },
        groupsCreated: { target: 85, current: 0, speed: 2 },
        messagesSent: { target: 12500, current: 0, speed: 100 },
        matchesMade: { target: 320, current: 0, speed: 5 }
    };
    
    function animateStat(statId, target) {
        const element = document.getElementById(statId);
        if (!element) return;
        
        const stat = stats[statId];
        const increment = Math.ceil(stat.target / 50);
        
        const timer = setInterval(() => {
            stat.current += increment;
            if (stat.current >= stat.target) {
                stat.current = stat.target;
                clearInterval(timer);
            }
            
            if (statId === 'messagesSent' || statId === 'activeUsers') {
                element.textContent = stat.current.toLocaleString() + '+';
            } else {
                element.textContent = stat.current + '+';
            }
        }, 30);
    }
    
    // Start animations when stats come into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                Object.keys(stats).forEach(statId => {
                    animateStat(statId, stats[statId].target);
                });
                observer.disconnect();
            }
        });
    }, { threshold: 0.5 });
    
    const statsContainer = document.querySelector('.quick-stats');
    if (statsContainer) {
        observer.observe(statsContainer);
    }
}

// Scroll Animations
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.main-card, .get-started-card, .offer-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
}

// Card Hover Animations
function initCardAnimations() {
    const cards = document.querySelectorAll('.main-card, .get-started-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const rect = card.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
            
            // Add glow effect
            card.style.boxShadow = `
                0 20px 40px rgba(155, 92, 255, 0.2),
                0 0 60px rgba(107, 70, 193, 0.1)
            `;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = '';
        });
    });
}

// Color Changing Animation (Gradient shift)
function initColorAnimation() {
    const elements = document.querySelectorAll('.logo i, .avatar-circle, .cta-btn.primary');
    
    function updateGradient() {
        const now = Date.now();
        const hue1 = (Math.sin(now * 0.0005) * 30 + 260).toFixed(0);
        const hue2 = (Math.sin(now * 0.0007) * 30 + 280).toFixed(0);
        
        const gradient = `linear-gradient(45deg, hsl(${hue1}, 80%, 65%), hsl(${hue2}, 80%, 65%))`;
        
        elements.forEach(element => {
            if (element.classList.contains('avatar-circle') || element.classList.contains('cta-btn')) {
                element.style.background = gradient;
            } else {
                element.style.background = gradient;
                element.style.webkitBackgroundClip = 'text';
                element.style.backgroundClip = 'text';
                element.style.color = 'transparent';
            }
        });
    }
    
    // Update gradient every 100ms
    setInterval(updateGradient, 100);
    
    // Initial update
    updateGradient();
}

// Add this CSS for card hover effects
const style = document.createElement('style');
style.textContent = `
    .main-card, .get-started-card {
        position: relative;
        overflow: hidden;
    }
    
    .main-card::before, .get-started-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(
            800px circle at var(--mouse-x) var(--mouse-y),
            rgba(155, 92, 255, 0.1),
            transparent 40%
        );
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .main-card:hover::before, .get-started-card:hover::before {
        opacity: 1;
    }
`;
document.head.appendChild(style);