import { useEffect, useRef } from 'react'

interface CanvasBackgroundProps {
  primaryColor?: string
  accentColor?: string
}

export default function CanvasBackground({ primaryColor = '#3B82F6', accentColor = '#8B5CF6' }: CanvasBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particle system
    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
      alpha: number
      life: number
    }> = []

    // Network nodes
    const nodes: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
      pulse: number
    }> = []

    // Initialize particles
    const initParticles = () => {
      particles.length = 0
      for (let i = 0; i < 150; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          radius: Math.random() * 2 + 0.5,
          color: Math.random() > 0.5 ? primaryColor : accentColor,
          alpha: Math.random() * 0.6 + 0.2,
          life: Math.random() * 100 + 50
        })
      }
    }

    // Initialize network nodes
    const initNodes = () => {
      nodes.length = 0
      for (let i = 0; i < 12; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 8 + 4,
          color: Math.random() > 0.5 ? primaryColor : accentColor,
          pulse: Math.random() * Math.PI * 2
        })
      }
    }

    initParticles()
    initNodes()

    // Floating geometric shapes
    const shapes: Array<{
      x: number
      y: number
      vx: number
      vy: number
      size: number
      rotation: number
      rotationSpeed: number
      type: 'triangle' | 'square' | 'hexagon'
      color: string
      alpha: number
    }> = []

    for (let i = 0; i < 8; i++) {
      shapes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 30 + 20,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        type: ['triangle', 'square', 'hexagon'][Math.floor(Math.random() * 3)] as 'triangle' | 'square' | 'hexagon',
        color: Math.random() > 0.5 ? primaryColor : accentColor,
        alpha: Math.random() * 0.15 + 0.05
      })
    }

    // Animation variables
    let time = 0
    let mouseX = 0
    let mouseY = 0

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Draw functions
    const drawParticle = (particle: typeof particles[0]) => {
      ctx.save()
      ctx.globalAlpha = particle.alpha
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
      ctx.fill()

      // Add glow effect
      ctx.globalAlpha = particle.alpha * 0.5
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.radius * 2, 0, Math.PI * 2)
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.radius * 2
      )
      gradient.addColorStop(0, particle.color)
      gradient.addColorStop(1, 'transparent')
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.restore()
    }

    const drawNode = (node: typeof nodes[0]) => {
      ctx.save()
      const pulseSize = node.radius + Math.sin(node.pulse + time * 0.05) * 3

      // Outer glow
      ctx.globalAlpha = 0.3
      ctx.fillStyle = node.color
      ctx.beginPath()
      ctx.arc(node.x, node.y, pulseSize * 2, 0, Math.PI * 2)
      ctx.fill()

      // Main node
      ctx.globalAlpha = 0.8
      ctx.fillStyle = node.color
      ctx.beginPath()
      ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const drawShape = (shape: typeof shapes[0]) => {
      ctx.save()
      ctx.translate(shape.x, shape.y)
      ctx.rotate(shape.rotation)
      ctx.globalAlpha = shape.alpha
      ctx.strokeStyle = shape.color
      ctx.lineWidth = 2

      ctx.beginPath()
      if (shape.type === 'triangle') {
        ctx.moveTo(0, -shape.size / 2)
        ctx.lineTo(-shape.size / 2, shape.size / 2)
        ctx.lineTo(shape.size / 2, shape.size / 2)
        ctx.closePath()
      } else if (shape.type === 'square') {
        ctx.rect(-shape.size / 2, -shape.size / 2, shape.size, shape.size)
      } else if (shape.type === 'hexagon') {
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3
          const x = Math.cos(angle) * shape.size / 2
          const y = Math.sin(angle) * shape.size / 2
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
      }
      ctx.stroke()
      ctx.restore()
    }

    // Draw connections between nodes
    const drawConnections = () => {
      ctx.save()
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 200) {
            const alpha = (200 - distance) / 200 * 0.3
            ctx.globalAlpha = alpha
            ctx.strokeStyle = primaryColor
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
      ctx.restore()
    }

    // Animation loop
    const animate = () => {
      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)') // slate-900
      gradient.addColorStop(0.5, 'rgba(30, 41, 59, 0.9)') // slate-800
      gradient.addColorStop(1, 'rgba(51, 65, 85, 0.95)') // slate-700
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Add subtle grid pattern
      ctx.save()
      ctx.globalAlpha = 0.03
      ctx.strokeStyle = primaryColor
      ctx.lineWidth = 1
      const gridSize = 50
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }
      ctx.restore()

      time++

      // Update and draw particles
      particles.forEach((particle, index) => {
        // Mouse interaction
        const dx = mouseX - particle.x
        const dy = mouseY - particle.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 100) {
          particle.vx += dx * 0.0001
          particle.vy += dy * 0.0001
        }

        particle.x += particle.vx
        particle.y += particle.vy

        // Boundary check with wrap-around
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Age particles
        particle.life--
        if (particle.life <= 0) {
          particles[index] = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8,
            radius: Math.random() * 2 + 0.5,
            color: Math.random() > 0.5 ? primaryColor : accentColor,
            alpha: Math.random() * 0.6 + 0.2,
            life: Math.random() * 100 + 50
          }
        }

        drawParticle(particle)
      })

      // Update and draw nodes
      nodes.forEach(node => {
        node.x += node.vx
        node.y += node.vy
        node.pulse += 0.05

        // Boundary bouncing
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        drawNode(node)
      })

      // Draw connections
      drawConnections()

      // Update and draw shapes
      shapes.forEach(shape => {
        shape.x += shape.vx
        shape.y += shape.vy
        shape.rotation += shape.rotationSpeed

        // Boundary wrap-around
        if (shape.x < -50) shape.x = canvas.width + 50
        if (shape.x > canvas.width + 50) shape.x = -50
        if (shape.y < -50) shape.y = canvas.height + 50
        if (shape.y > canvas.height + 50) shape.y = -50

        drawShape(shape)
      })

      requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [primaryColor, accentColor])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 w-full h-full"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' }}
    />
  )
}