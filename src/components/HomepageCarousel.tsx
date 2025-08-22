
import { useState, useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Autoplay from 'embla-carousel-autoplay';

interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  button_text: string;
  button_link: string;
  city: string;
  is_active: boolean;
  sort_order: number;
}

const HomepageCarousel = () => {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSlides = async () => {
      try {
        console.log('Loading carousel slides...');
        
        // Get user's selected city from localStorage
        const selectedCity = localStorage.getItem('selectedCity') || 'All Cities';
        console.log('Selected city for carousel:', selectedCity);
        
        let query = supabase
          .from('carousel_slides')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        // Filter by city - show "All Cities" slides plus city-specific slides
        if (selectedCity !== 'All Cities') {
          query = query.in('city', ['All Cities', selectedCity]);
        } else {
          query = query.eq('city', 'All Cities');
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error loading carousel slides:', error);
          setSlides([]);
        } else {
          console.log('Loaded carousel slides:', data);
          setSlides(data || []);
        }
      } catch (error) {
        console.error('Error in loadSlides:', error);
        setSlides([]);
      } finally {
        setLoading(false);
      }
    };

    loadSlides();
  }, []);

  if (loading) {
    return (
      <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gray-200 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400">Loading carousel...</div>
        </div>
      </div>
    );
  }

  // Show placeholder if no slides available
  if (slides.length === 0) {
    return (
      <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white max-w-4xl px-4">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Welcome to Ticketooz
            </h1>
            <h2 className="text-xl md:text-2xl mb-6 text-blue-200">
              Discover Amazing Events
            </h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
              Book tickets for the best events in your city
            </p>
            <Link to="/events">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3">
                Explore Events
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <Carousel 
        className="w-full"
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
            stopOnInteraction: true,
          }) as any,
        ]}
      >
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem key={slide.id}>
              <div className="relative h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden">
                {slide.image ? (
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600"></div>
                )}
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white max-w-4xl px-4">
                    <h1 className="text-4xl md:text-6xl font-bold mb-4">
                      {slide.title}
                    </h1>
                    {slide.subtitle && (
                      <h2 className="text-xl md:text-2xl mb-6 text-blue-200">
                        {slide.subtitle}
                      </h2>
                    )}
                    {slide.description && (
                      <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
                        {slide.description}
                      </p>
                    )}
                    <Link to={slide.button_link || '/events'}>
                      <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3">
                        {slide.button_text || 'Learn More'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 && (
          <>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default HomepageCarousel;
