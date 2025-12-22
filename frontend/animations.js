// animations.js
document.addEventListener('DOMContentLoaded', function() {
    // Loading Screen
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);
    }

    // Particle System
    class ParticleSystem {
        constructor() {
            this.canvas = document.getElementById('particles-canvas');
            if (!this.canvas) return;
            
            this.ctx = this.canvas.getContext('2d');
            this.particles = [];
            this.particleCount = 100;
            
            this.resizeCanvas();
            this.initParticles();
            this.animate();
            
            window.addEventListener('resize', () => this.resizeCanvas());
        }
        
        resizeCanvas() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
        
        initParticles() {
            for (let i = 0; i < this.particleCount; i++) {
                this.particles.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: Math.random() * 3 + 1,
                    speedX: Math.random() * 1 - 0.5,
                    speedY: Math.random() * 1 - 0.5,
                    color: `rgba(${Math.floor(Math.random() * 100 + 155)}, 
                            ${Math.floor(Math.random() * 100)}, 
                            ${Math.floor(Math.random() * 155 + 100)}, 
                            ${Math.random() * 0.5 + 0.2})`
                });
            }
        }
        
        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw connections
            for (let i = 0; i < this.particles.length; i++) {
                for (let j = i + 1; j < this.particles.length; j++) {
                    const dx = this.particles[i].x - this.particles[j].x;
                    const dy = this.particles[i].y - this.particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 100) {
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = `rgba(106, 17, 203, ${0.2 * (1 - distance/100)})`;
                        this.ctx.lineWidth = 0.5;
                        this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                        this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                        this.ctx.stroke();
                    }
                }
            }
            
            // Update and draw particles
            this.particles.forEach(particle => {
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                
                // Bounce off walls
                if (particle.x < 0 || particle.x > this.canvas.width) particle.speedX *= -1;
                if (particle.y < 0 || particle.y > this.canvas.height) particle.speedY *= -1;
                
                // Draw particle
                this.ctx.beginPath();
                this.ctx.fillStyle = particle.color;
                this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            
            requestAnimationFrame(() => this.animate());
        }
    }

    // Initialize particle system
    new ParticleSystem();

    // Cursor Follower
    const cursorFollower = document.querySelector('.cursor-follower');
    if (cursorFollower) {
        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;
        
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });
        
        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.1;
            cursorY += (mouseY - cursorY) * 0.1;
            
            cursorFollower.style.left = cursorX + 'px';
            cursorFollower.style.top = cursorY + 'px';
            
            requestAnimationFrame(animateCursor);
        }
        
        animateCursor();
    }

    // Card Hover Animations
    const cards = document.querySelectorAll('.feature-card, .team-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.style.setProperty('--mouse-x', `${x}px`);
            this.style.setProperty('--mouse-y', `${y}px`);
            
            // Add glow effect
            this.style.boxShadow = `
                0 0 30px rgba(106, 17, 203, 0.3),
                0 0 60px rgba(37, 117, 252, 0.1)
            `;
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = '';
        });
    });

    // Form submission animation
    const contactForm = document.querySelector('.contact-form form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const submitBtn = this.querySelector('.btn-submit');
            const originalText = submitBtn.textContent;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            submitBtn.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                submitBtn.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
                submitBtn.style.background = 'linear-gradient(45deg, #00b09b, #96c93d)';
                
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.background = 'linear-gradient(45deg, var(--primary), var(--secondary))';
                    this.reset();
                }, 2000);
            }, 1500);
        });
    }

    // Scroll animations
    function revealOnScroll() {
        const reveals = document.querySelectorAll('.feature-card, .team-card, .contact-form');
        
        reveals.forEach(element => {
            const windowHeight = window.innerHeight;
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < windowHeight - elementVisible) {
                element.classList.add('active');
            }
        });
    }
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn-hero, .btn-submit, .btn-join, .btn-login');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.7);
                transform: scale(0);
                animation: ripple-animation 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                top: ${y}px;
                left: ${x}px;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Add CSS for ripple animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        .feature-card.active, .team-card.active, .contact-form.active {
            animation: fadeUp 0.8s ease forwards;
        }
        
        @keyframes fadeUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
});