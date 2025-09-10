import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { landingPagesAPI } from '@/lib/api'
import { LandingPage } from '@/types'
import {
  Phone,
  Mail,
  MapPin,
  Star,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LiveLandingPage() {
  const { slug } = useParams()
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLandingPage = async () => {
      if (!slug) return

      try {
        // In a real implementation, you'd have an endpoint that fetches by slug
        // For now, we'll simulate this with a search through all landing pages
        const response = await landingPagesAPI.getAll()
        const pages = response.data.data?.landingPages || []
        const page = pages.find(p => p.url.includes(slug))
        
        if (page) {
          setLandingPage(page)
          
          // Update page visits
          // Note: In production, you'd want this to be a separate endpoint
          // to avoid authentication issues for public pages
        } else {
          setError('Landing page not found')
        }
      } catch (err) {
        setError('Failed to load landing page')
        console.error('Failed to fetch landing page:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLandingPage()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error || !landingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'The landing page you\'re looking for doesn\'t exist or has been moved.'}
          </p>
          <Button onClick={() => window.location.href = '/'}>
            Go to Homepage
          </Button>
        </div>
      </div>
    )
  }

  const { colors, content, contact, images, seo } = landingPage

  // Set dynamic SEO
  useEffect(() => {
    if (seo?.title) {
      document.title = seo.title
    }
    
    if (seo?.description) {
      const metaDescription = document.querySelector('meta[name="description"]')
      if (metaDescription) {
        metaDescription.setAttribute('content', seo.description)
      }
    }
  }, [seo])

  const handleCTAClick = () => {
    // Scroll to contact section or trigger contact action
    const contactSection = document.getElementById('contact-section')
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative py-12 sm:py-16 md:py-20 px-4 sm:px-6 text-center min-h-[500px] sm:min-h-[600px] lg:min-h-[700px] flex items-center"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`,
        }}
      >
        {/* Hero Image */}
        {images && images.find(img => img.type === 'hero') && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url(${images.find(img => img.type === 'hero')?.url})`,
            }}
          />
        )}
        
        <div className="relative max-w-6xl mx-auto px-2 sm:px-0">
          <h1
            className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 leading-tight"
            style={{ color: colors.primary }}
          >
            {content.headline}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 mb-6 sm:mb-8 max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
            {content.subheadline}
          </p>
          <Button
            size="lg"
            className="px-6 sm:px-8 md:px-12 py-3 md:py-4 text-base sm:text-lg md:text-xl font-semibold hover:scale-105 transition-transform w-full sm:w-auto max-w-xs sm:max-w-none mx-auto"
            style={{
              backgroundColor: colors.primary,
              borderColor: colors.primary,
            }}
            onClick={handleCTAClick}
          >
            {content.cta}
          </Button>
        </div>
      </section>

      {/* Description Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed max-w-2xl sm:max-w-3xl md:max-w-4xl mx-auto px-2 sm:px-0">
            {content.description}
          </p>
        </div>
      </section>

      {/* Features Section */}
      {content.features && content.features.length > 0 && (
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-12 md:mb-16"
              style={{ color: colors.primary }}
            >
              Our Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {content.features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm border hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                    style={{ backgroundColor: `${colors.accent}20` }}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">{feature}</h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Professional service tailored to your individual needs and goals.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Feature Image Section */}
      {images && images.find(img => img.type === 'feature') && (
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div className="order-2 lg:order-1">
                <img
                  src={images.find(img => img.type === 'feature')?.url}
                  alt={images.find(img => img.type === 'feature')?.alt}
                  className="w-full h-auto rounded-xl shadow-lg"
                />
              </div>
              <div className="order-1 lg:order-2 text-center lg:text-left">
                <h2
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6"
                  style={{ color: colors.primary }}
                >
                  Why Choose Us?
                </h2>
                <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6">
                  We provide personalized, professional care designed to help you achieve your goals in a supportive environment.
                </p>
                <Button
                  size="lg"
                  className="px-8 py-3"
                  style={{
                    backgroundColor: colors.accent,
                    borderColor: colors.accent,
                  }}
                  onClick={handleCTAClick}
                >
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {content.testimonials && content.testimonials.length > 0 && (
        <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-12 md:mb-16"
              style={{ color: colors.primary }}
            >
              What Our Clients Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {content.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white p-4 sm:p-6 md:p-8 rounded-xl shadow-sm border"
                >
                  <div className="flex items-center mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-current"
                        style={{ color: colors.accent }}
                      />
                    ))}
                  </div>
                  <blockquote className="text-gray-700 mb-4 sm:mb-6 italic text-sm sm:text-base md:text-lg">
                    "{testimonial.text}"
                  </blockquote>
                  <cite className="text-sm sm:text-base font-semibold text-gray-900">
                    — {testimonial.author}
                  </cite>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section
        className="py-12 sm:py-16 md:py-20 px-4 sm:px-6"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
        }}
      >
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90">
            Take the first step towards positive change today.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="px-6 sm:px-8 md:px-12 py-3 md:py-4 text-base sm:text-lg md:text-xl font-semibold bg-white hover:bg-gray-100 w-full sm:w-auto max-w-xs sm:max-w-none mx-auto"
            style={{ color: colors.primary }}
            onClick={handleCTAClick}
          >
            {content.cta}
          </Button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact-section" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 md:mb-16">Get In Touch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12 mb-12 sm:mb-16">
            {contact.phone && (
              <div className="text-center">
                <Phone className="w-8 sm:w-10 md:w-12 h-8 sm:h-10 md:h-12 mx-auto mb-4 sm:mb-6" style={{ color: colors.accent }} />
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Call Us</h3>
                <p className="text-gray-300 text-base sm:text-lg">{contact.phone}</p>
                <Button
                  variant="outline"
                  className="mt-4 border-white text-white hover:bg-white hover:text-gray-900"
                  onClick={() => window.location.href = `tel:${contact.phone}`}
                >
                  Call Now
                </Button>
              </div>
            )}
            
            {contact.email && (
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-6" style={{ color: colors.accent }} />
                <h3 className="text-xl font-semibold mb-4">Email Us</h3>
                <p className="text-gray-300 text-lg">{contact.email}</p>
                <Button
                  variant="outline"
                  className="mt-4 border-white text-white hover:bg-white hover:text-gray-900"
                  onClick={() => window.location.href = `mailto:${contact.email}`}
                >
                  Send Email
                </Button>
              </div>
            )}
            
            {contact.address && (
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-6" style={{ color: colors.accent }} />
                <h3 className="text-xl font-semibold mb-4">Visit Us</h3>
                <p className="text-gray-300 text-lg">{contact.address}</p>
                <Button
                  variant="outline"
                  className="mt-4 border-white text-white hover:bg-white hover:text-gray-900"
                  onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(contact.address)}`)}
                >
                  Get Directions
                </Button>
              </div>
            )}
          </div>

          {contact.hours && (
            <div className="text-center border-t border-gray-700 pt-12">
              <div className="flex items-center justify-center space-x-3 text-gray-300">
                <Clock className="w-6 h-6" />
                <span className="text-lg">{contact.hours}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-100">
        <div className="max-w-4xl mx-auto text-center text-gray-600">
          <p className="text-sm">
            © 2024 {landingPage.name}. All rights reserved.
          </p>
          <p className="text-xs mt-2 opacity-75">
            Powered by Mindful Ad Wizard
          </p>
        </div>
      </footer>
    </div>
  )
}