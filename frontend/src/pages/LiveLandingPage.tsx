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
  MessageCircle,
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
        const response = await landingPagesAPI.getPublicBySlug(slug)
        if (response.data.success && response.data.data.landingPage) {
          setLandingPage(response.data.data.landingPage)
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
    // If WhatsApp is available, open WhatsApp directly
    if (contact.whatsapp) {
      const message = `Hi! I'm interested in ${content.headline}. I'd like to know more about your services.`
      const whatsappUrl = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')
    } else {
      // Fallback to contact section
      const contactSection = document.getElementById('contact-section')
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const handleWhatsAppClick = () => {
    if (contact.whatsapp) {
      const message = `Hi! I found your landing page and I'm interested in your services. Could you please provide more information?`
      const whatsappUrl = `https://wa.me/${contact.whatsapp.replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`
      window.open(whatsappUrl, '_blank')

      // Optionally track conversion here
      // This would be a good place to call an analytics endpoint
    }
  }

  return (
    <div className="min-h-screen">
      {/* Floating WhatsApp Button */}
      {contact.whatsapp && (
        <button
          onClick={handleWhatsAppClick}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full shadow-lg hover:scale-110 transition-all duration-300 flex items-center justify-center"
          style={{ backgroundColor: '#25D366' }}
          aria-label="Contact us on WhatsApp"
        >
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
        </button>
      )}

      {/* Hero Section */}
      <section
        className="relative py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4 md:px-6 text-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px] lg:min-h-[700px] flex items-center"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)`,
        }}
      >
        {/* Hero Image */}
        {images && images.find(img => img.type === 'hero') && (
          <div className="absolute inset-0">
            <img
              src={images.find(img => img.type === 'hero')?.storedUrl || images.find(img => img.type === 'hero')?.url}
              alt={images.find(img => img.type === 'hero')?.alt || 'Hero background'}
              className="w-full h-full object-cover opacity-20"
              onError={(e) => {
                const heroImage = images.find(img => img.type === 'hero');
                const fallbackUrl = heroImage?.fallbackUrl;

                if (fallbackUrl && e.currentTarget.src !== fallbackUrl) {
                  console.warn('Hero image failed, using fallback:', e.currentTarget.src);
                  e.currentTarget.src = fallbackUrl;
                } else {
                  console.warn('Hero image and fallback failed, hiding image');
                  e.currentTarget.style.display = 'none';
                }
              }}
            />
          </div>
        )}
        
        <div className="relative max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
          <h1
            className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight"
            style={{ color: colors.primary }}
          >
            {content.headline}
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-4 sm:mb-6 md:mb-8 max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto leading-relaxed">
            {content.subheadline}
          </p>
          <Button
            size="lg"
            className="px-4 sm:px-6 md:px-8 lg:px-12 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg lg:text-xl font-semibold hover:scale-105 transition-transform w-full sm:w-auto max-w-sm sm:max-w-md md:max-w-none mx-auto"
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
      <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4 md:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-5xl mx-auto">
            {content.description}
          </p>
        </div>
      </section>

      {/* Features Section */}
      {content.features && content.features.length > 0 && (
        <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4 md:px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16"
              style={{ color: colors.primary }}
            >
              Our Services
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
              {content.features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white p-3 sm:p-4 md:p-6 lg:p-8 rounded-lg sm:rounded-xl shadow-sm border hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105"
                >
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 sm:mb-4 md:mb-6"
                    style={{ backgroundColor: `${colors.accent}20` }}
                  >
                    <div
                      className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">{feature}</h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed">
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
        <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 items-center">
              <div className="order-2 lg:order-1">
                <img
                  src={images.find(img => img.type === 'feature')?.storedUrl || images.find(img => img.type === 'feature')?.url}
                  alt={images.find(img => img.type === 'feature')?.alt || 'Professional services'}
                  className="w-full h-auto rounded-xl shadow-lg"
                  onError={(e) => {
                    const featureImage = images.find(img => img.type === 'feature');
                    const fallbackUrl = featureImage?.fallbackUrl;

                    if (fallbackUrl && e.currentTarget.src !== fallbackUrl) {
                      console.warn('Feature image failed, using fallback:', e.currentTarget.src);
                      e.currentTarget.src = fallbackUrl;
                    } else {
                      console.warn('Feature image and fallback failed, hiding section');
                      const section = e.currentTarget.closest('section');
                      if (section) {
                        section.style.display = 'none';
                      }
                    }
                  }}
                  onLoad={() => {
                    console.log('Feature image loaded successfully');
                  }}
                />
              </div>
              <div className="order-1 lg:order-2 text-center lg:text-left px-2 sm:px-4">
                <h2
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 md:mb-6"
                  style={{ color: colors.primary }}
                >
                  Why Choose Us?
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-700 mb-4 sm:mb-6 leading-relaxed">
                  We provide personalized, professional care designed to help you achieve your goals in a supportive environment.
                </p>
                <Button
                  size="lg"
                  className="px-4 sm:px-6 md:px-8 py-2 sm:py-3 w-full sm:w-auto"
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
        <section className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4 md:px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16"
              style={{ color: colors.primary }}
            >
              What Our Clients Say
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
              {content.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white p-3 sm:p-4 md:p-6 lg:p-8 rounded-lg sm:rounded-xl shadow-sm border"
                >
                  <div className="flex items-center mb-3 sm:mb-4 md:mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 sm:w-5 sm:h-5 fill-current"
                        style={{ color: colors.accent }}
                      />
                    ))}
                  </div>
                  <blockquote className="text-gray-700 mb-3 sm:mb-4 md:mb-6 italic text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed">
                    "{testimonial.text}"
                  </blockquote>
                  <cite className="text-xs sm:text-sm md:text-base font-semibold text-gray-900">
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
        className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4 md:px-6"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
        }}
      >
        <div className="max-w-5xl mx-auto text-center text-white">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-3 sm:mb-4 md:mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 md:mb-8 opacity-90 leading-relaxed max-w-2xl mx-auto">
            Take the first step towards positive change today.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="px-4 sm:px-6 md:px-8 lg:px-12 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg lg:text-xl font-semibold bg-white hover:bg-gray-100 w-full sm:w-auto max-w-sm sm:max-w-md md:max-w-none mx-auto"
            style={{ color: colors.primary }}
            onClick={handleCTAClick}
          >
            {content.cta}
          </Button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact-section" className="py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4 md:px-6 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">Get In Touch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-12 mb-8 sm:mb-12 md:mb-16">
            {contact.whatsapp && (
              <div className="text-center p-3 sm:p-4">
                <MessageCircle className="w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 mx-auto mb-3 sm:mb-4 md:mb-6" style={{ color: '#25D366' }} />
                <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">WhatsApp Us</h3>
                <p className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-4">{contact.whatsapp}</p>
                <Button
                  className="mt-2 sm:mt-4 text-white hover:scale-105 transition-transform w-full sm:w-auto text-xs sm:text-sm md:text-base"
                  style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                  onClick={handleWhatsAppClick}
                >
                  Start Conversation
                </Button>
              </div>
            )}

            {contact.phone && (
              <div className="text-center p-3 sm:p-4">
                <Phone className="w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 mx-auto mb-3 sm:mb-4 md:mb-6" style={{ color: colors.accent }} />
                <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">Call Us</h3>
                <p className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-4">{contact.phone}</p>
                <Button
                  variant="outline"
                  className="mt-2 sm:mt-4 border-white text-white hover:bg-white hover:text-gray-900 w-full sm:w-auto text-xs sm:text-sm md:text-base"
                  onClick={() => window.location.href = `tel:${contact.phone}`}
                >
                  Call Now
                </Button>
              </div>
            )}

            {contact.email && (
              <div className="text-center p-3 sm:p-4">
                <Mail className="w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 mx-auto mb-3 sm:mb-4 md:mb-6" style={{ color: colors.accent }} />
                <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">Email Us</h3>
                <p className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-4 break-words">{contact.email}</p>
                <Button
                  variant="outline"
                  className="mt-2 sm:mt-4 border-white text-white hover:bg-white hover:text-gray-900 w-full sm:w-auto text-xs sm:text-sm md:text-base"
                  onClick={() => window.location.href = `mailto:${contact.email}`}
                >
                  Send Email
                </Button>
              </div>
            )}

            {contact.address && (
              <div className="text-center p-3 sm:p-4">
                <MapPin className="w-6 sm:w-8 md:w-10 lg:w-12 h-6 sm:h-8 md:h-10 lg:h-12 mx-auto mb-3 sm:mb-4 md:mb-6" style={{ color: colors.accent }} />
                <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 md:mb-4">Visit Us</h3>
                <p className="text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg mb-3 sm:mb-4 leading-relaxed">{contact.address}</p>
                <Button
                  variant="outline"
                  className="mt-2 sm:mt-4 border-white text-white hover:bg-white hover:text-gray-900 w-full sm:w-auto text-xs sm:text-sm md:text-base"
                  onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(contact.address)}`)}
                >
                  Get Directions
                </Button>
              </div>
            )}
          </div>

          {contact.hours && (
            <div className="text-center border-t border-gray-700 pt-6 sm:pt-8 md:pt-12">
              <div className="flex items-center justify-center space-x-2 sm:space-x-3 text-gray-300">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                <span className="text-sm sm:text-base md:text-lg">{contact.hours}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 md:py-12 px-3 sm:px-4 md:px-6 bg-gray-100">
        <div className="max-w-5xl mx-auto text-center text-gray-600">
          <p className="text-xs sm:text-sm md:text-base">
            © 2024 {landingPage.name}. All rights reserved.
          </p>
          <p className="text-xs sm:text-sm mt-1 sm:mt-2 opacity-75">
            Powered by Mindful Ad Wizard
          </p>
        </div>
      </footer>
    </div>
  )
}