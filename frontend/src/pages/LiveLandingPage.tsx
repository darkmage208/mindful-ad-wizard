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

  // MUST call all hooks at the top, before any early returns
  useEffect(() => {
    let mounted = true

    const fetchLandingPage = async () => {
      if (!slug) {
        if (mounted) {
          setLoading(false)
          setError('No page identifier provided')
        }
        return
      }

      try {
        const response = await landingPagesAPI.getPublicBySlug(slug)
        if (!mounted) return

        if (response.data.success && response.data.data.landingPage) {
          setLandingPage(response.data.data.landingPage)
        } else {
          setError('Landing page not found')
        }
      } catch (err) {
        if (!mounted) return

        setError('Failed to load landing page')
        console.error('Failed to fetch landing page:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchLandingPage()

    return () => {
      mounted = false
    }
  }, [slug])

  // Set dynamic SEO - MOVED BEFORE EARLY RETURNS
  useEffect(() => {
    if (!landingPage) return

    const seo = landingPage.seo

    if (seo?.title) {
      document.title = seo.title
    }

    if (seo?.description) {
      const metaDescription = document.querySelector('meta[name="description"]')
      if (metaDescription) {
        metaDescription.setAttribute('content', seo.description)
      }
    }

    // Cleanup function to reset title on unmount
    return () => {
      document.title = 'Mindful Ad Wizard'
    }
  }, [landingPage])

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
      {/* Canvas Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-3000"></div>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      {contact.whatsapp && (
        <button
          onClick={handleWhatsAppClick}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 lg:bottom-8 lg:right-8 z-50 w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center"
          style={{ backgroundColor: '#25D366' }}
          aria-label="Contact us on WhatsApp"
        >
          <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-white" />
        </button>
      )}

      {/* Hero Section */}
      <section
        className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12 text-center"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}08, ${colors.accent}05)`,
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
        
        <div className="relative max-w-6xl mx-auto">
          <h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold mb-4 sm:mb-6 md:mb-8 lg:mb-10 leading-tight"
            style={{ color: colors.primary }}
          >
            {content.headline}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-gray-600 mb-6 sm:mb-8 md:mb-10 lg:mb-12 max-w-xs sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto leading-relaxed">
            {content.subheadline}
          </p>
          <Button
            size="lg"
            className="px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16 py-3 sm:py-4 md:py-5 lg:py-6 text-base sm:text-lg md:text-xl lg:text-2xl font-semibold hover:scale-105 transition-all duration-300 w-full sm:w-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto shadow-lg"
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
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl text-gray-700 leading-relaxed max-w-sm sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto">
            {content.description}
          </p>
        </div>
      </section>

      {/* Features Section */}
      {content.features && content.features.length > 0 && (
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 px-4 sm:px-6 md:px-8 lg:px-12 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20"
              style={{ color: colors.primary }}
            >
              Our Services
            </h2>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12">
              {content.features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 md:p-8 lg:p-10 rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105 hover:-translate-y-2 w-full sm:w-80 md:w-96 lg:w-80 xl:w-96"
                >
                  <div
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-full flex items-center justify-center mb-4 sm:mb-6 md:mb-8 mx-auto"
                    style={{ backgroundColor: `${colors.accent}20` }}
                  >
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4 md:mb-6 text-center">{feature}</h3>
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed text-center">
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
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 md:gap-16 lg:gap-20 items-center">
              <div className="order-2 lg:order-1">
                <img
                  src={images.find(img => img.type === 'feature')?.storedUrl || images.find(img => img.type === 'feature')?.url}
                  alt={images.find(img => img.type === 'feature')?.alt || 'Professional services'}
                  className="w-full h-auto rounded-xl shadow-2xl hover:shadow-3xl transition-shadow duration-300"
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
              <div className="order-1 lg:order-2 text-center lg:text-left">
                <h2
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 md:mb-8 lg:mb-10"
                  style={{ color: colors.primary }}
                >
                  Why Choose Us?
                </h2>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-gray-700 mb-6 sm:mb-8 md:mb-10 lg:mb-12 leading-relaxed">
                  We provide personalized, professional care designed to help you achieve your goals in a supportive environment.
                </p>
                <Button
                  size="lg"
                  className="px-6 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-4 md:py-5 lg:py-6 text-base sm:text-lg md:text-xl lg:text-2xl w-full sm:w-auto hover:scale-105 transition-all duration-300 shadow-lg"
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
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 px-4 sm:px-6 md:px-8 lg:px-12 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20"
              style={{ color: colors.primary }}
            >
              What Our Clients Say
            </h2>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12">
              {content.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 md:p-8 lg:p-10 rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105 w-full sm:w-80 md:w-96 lg:w-80 xl:w-96"
                >
                  <div className="flex items-center justify-center mb-4 sm:mb-6 md:mb-8">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 fill-current"
                        style={{ color: colors.accent }}
                      />
                    ))}
                  </div>
                  <blockquote className="text-gray-700 mb-4 sm:mb-6 md:mb-8 italic text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl leading-relaxed text-center">
                    "{testimonial.text}"
                  </blockquote>
                  <cite className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 text-center block">
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
        className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 px-4 sm:px-6 md:px-8 lg:px-12"
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
        }}
      >
        <div className="max-w-6xl mx-auto text-center text-white">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 md:mb-8 lg:mb-10">
            Ready to Get Started?
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl mb-6 sm:mb-8 md:mb-10 lg:mb-12 opacity-90 leading-relaxed max-w-xs sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
            Take the first step towards positive change today.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="px-6 sm:px-8 md:px-10 lg:px-12 xl:px-16 py-3 sm:py-4 md:py-5 lg:py-6 text-base sm:text-lg md:text-xl lg:text-2xl font-semibold bg-white hover:bg-gray-100 hover:scale-105 transition-all duration-300 w-full sm:w-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto shadow-lg"
            style={{ color: colors.primary }}
            onClick={handleCTAClick}
          >
            {content.cta}
          </Button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact-section" className="py-12 sm:py-16 md:py-20 lg:py-24 xl:py-32 px-4 sm:px-6 md:px-8 lg:px-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-center mb-8 sm:mb-12 md:mb-16 lg:mb-20">Get In Touch</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8 md:gap-10 lg:gap-12 xl:gap-16 mb-12 sm:mb-16 md:mb-20">
            {contact.whatsapp && (
              <div className="text-center p-4 sm:p-6 md:p-8 flex flex-col h-full">
                <div className="flex-1">
                  <MessageCircle className="w-8 sm:w-10 md:w-12 lg:w-14 xl:w-16 h-8 sm:h-10 md:h-12 lg:h-14 xl:h-16 mx-auto mb-4 sm:mb-6 md:mb-8" style={{ color: '#25D366' }} />
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4 md:mb-6">WhatsApp Us</h3>
                  <p className="text-gray-300 text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6">{contact.whatsapp}</p>
                </div>
                <Button
                  className="mt-auto bg-white hover:bg-gray-100 hover:scale-105 transition-all duration-300 w-full text-sm sm:text-base md:text-lg font-semibold py-2 sm:py-3 md:py-4 border-0"
                  style={{ color: '#25D366' }}
                  onClick={handleWhatsAppClick}
                >
                  Start Conversation
                </Button>
              </div>
            )}

            {contact.phone && (
              <div className="text-center p-4 sm:p-6 md:p-8 flex flex-col h-full">
                <div className="flex-1">
                  <Phone className="w-8 sm:w-10 md:w-12 lg:w-14 xl:w-16 h-8 sm:h-10 md:h-12 lg:h-14 xl:h-16 mx-auto mb-4 sm:mb-6 md:mb-8" style={{ color: colors.accent }} />
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4 md:mb-6">Call Us</h3>
                  <p className="text-gray-300 text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6">{contact.phone}</p>
                </div>
                <Button
                  className="mt-auto bg-white hover:bg-gray-100 hover:scale-105 transition-all duration-300 w-full text-sm sm:text-base md:text-lg font-semibold py-2 sm:py-3 md:py-4 border-0"
                  style={{ color: colors.accent }}
                  onClick={() => window.location.href = `tel:${contact.phone}`}
                >
                  Call Now
                </Button>
              </div>
            )}

            {contact.email && (
              <div className="text-center p-4 sm:p-6 md:p-8 flex flex-col h-full">
                <div className="flex-1">
                  <Mail className="w-8 sm:w-10 md:w-12 lg:w-14 xl:w-16 h-8 sm:h-10 md:h-12 lg:h-14 xl:h-16 mx-auto mb-4 sm:mb-6 md:mb-8" style={{ color: colors.accent }} />
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4 md:mb-6">Email Us</h3>
                  <p className="text-gray-300 text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 break-words">{contact.email}</p>
                </div>
                <Button
                  className="mt-auto bg-white hover:bg-gray-100 hover:scale-105 transition-all duration-300 w-full text-sm sm:text-base md:text-lg font-semibold py-2 sm:py-3 md:py-4 border-0"
                  style={{ color: colors.accent }}
                  onClick={() => window.location.href = `mailto:${contact.email}`}
                >
                  Send Email
                </Button>
              </div>
            )}

            {contact.address && (
              <div className="text-center p-4 sm:p-6 md:p-8 flex flex-col h-full">
                <div className="flex-1">
                  <MapPin className="w-8 sm:w-10 md:w-12 lg:w-14 xl:w-16 h-8 sm:h-10 md:h-12 lg:h-14 xl:h-16 mx-auto mb-4 sm:mb-6 md:mb-8" style={{ color: colors.accent }} />
                  <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold mb-3 sm:mb-4 md:mb-6">Visit Us</h3>
                  <p className="text-gray-300 text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 leading-relaxed">{contact.address}</p>
                </div>
                <Button
                  className="mt-auto bg-white hover:bg-gray-100 hover:scale-105 transition-all duration-300 w-full text-sm sm:text-base md:text-lg font-semibold py-2 sm:py-3 md:py-4 border-0"
                  style={{ color: colors.accent }}
                  onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(contact.address)}`)}
                >
                  Get Directions
                </Button>
              </div>
            )}
          </div>

          {contact.hours && (
            <div className="text-center border-t border-gray-700 pt-8 sm:pt-12 md:pt-16">
              <div className="flex items-center justify-center space-x-3 sm:space-x-4 text-gray-300">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
                <span className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl">{contact.hours}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 md:py-16 lg:py-20 px-4 sm:px-6 md:px-8 lg:px-12 bg-gray-100">
        <div className="max-w-6xl mx-auto text-center text-gray-600">
          <p className="text-sm sm:text-base md:text-lg lg:text-xl">
            © 2024 {landingPage.name}. All rights reserved.
          </p>
          <p className="text-sm sm:text-base md:text-lg mt-2 sm:mt-3 md:mt-4 opacity-75">
            Powered by Mindful Ad Wizard
          </p>
        </div>
      </footer>
    </div>
  )
}