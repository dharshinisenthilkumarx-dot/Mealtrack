import React, { useState, useEffect } from 'react';
import { FoodItem, Restaurant } from '../../types';
import { api } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { Plus, Check, Star, Clock, MapPin, Search } from 'lucide-react';

interface FoodMenuProps {
  onOrderPlaced?: (orderId: string) => void;
}

export const FoodMenu: React.FC<FoodMenuProps> = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  const { addToCart } = useCart();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const rests = await api.getRestaurants();
        setRestaurants(rests);
        if (rests.length > 0) {
          setSelectedRestaurant(rests[0]);
          const items = await api.getFoodItems(rests[0].restaurant_id);
          setFoodItems(items);
        }
      } catch (err) {
        console.error('Error loading menu:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectRestaurant = async (rest: Restaurant) => {
    setSelectedRestaurant(rest);
    setSelectedCategory('all');
    try {
      const items = await api.getFoodItems(rest.restaurant_id);
      setFoodItems(items);
    } catch (err) {
      console.error('Error fetching items for restaurant:', err);
    }
  };

  const categories = ['all', ...Array.from(new Set(foodItems.map((item) => item.category)))];

  const filteredItems = foodItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (item: FoodItem) => {
    if (!selectedRestaurant) return;
    addToCart(item, selectedRestaurant);
    setAddedItemId(item.item_id);
    setTimeout(() => setAddedItemId(null), 1200);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 px-4 text-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-zinc-500">Curating fresh culinary menus...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero Showcase Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-zinc-950 text-white mb-10 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center">
          <div className="p-8 sm:p-12 lg:p-14 z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 uppercase tracking-widest mb-3">
              <span>Fresh Delivery</span>
              <span>·</span>
              <span>Zero Uncertainty</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-display leading-[1.1] mb-4 text-balance">
              Track your culinary cravings in real time.
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 max-w-lg mb-6 leading-relaxed">
              From the instant the chef fires the pan to the moment our courier reaches your door —
              experience continuous live telemetry, clear stage checkpoints, and transparent ETA.
            </p>

            <div className="flex items-center gap-6 text-xs text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-400" />
                <span>Live dynamic ETA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-400" />
                <span>Verified Kitchens</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-80 lg:h-full relative overflow-hidden">
            <img
              src="/src/assets/images/food_delivery_hero_1793862712129.jpg"
              alt="Artisanal food delivery feast spread"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent" />
          </div>
        </div>
      </div>

      {/* Restaurant Selector Tabs */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight font-display">
            Select a Restaurant
          </h2>
          <span className="text-xs text-zinc-500">
            {restaurants.length} kitchens open now
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {restaurants.map((rest) => {
            const isSelected = selectedRestaurant?.restaurant_id === rest.restaurant_id;
            return (
              <button
                key={rest.restaurant_id}
                onClick={() => handleSelectRestaurant(rest)}
                className={`text-left p-4 rounded-2xl border transition-all relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'bg-orange-50/40 border-orange-500 ring-1 ring-orange-500 shadow-sm'
                    : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={rest.image}
                    alt={rest.restaurant_name}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-zinc-100"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-bold text-zinc-900 truncate">
                        {rest.restaurant_name}
                      </h3>
                      <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600 font-mono tabular-nums">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {rest.rating}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                      {rest.cuisine}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" />
                        ~{rest.prep_time_minutes + rest.pickup_time_minutes + rest.travel_time_minutes}m
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{rest.address.split(',')[0]}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Search and Category Filter Controls */}
      {selectedRestaurant && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 font-display">
                {selectedRestaurant.restaurant_name} Menu
              </h3>
              <p className="text-xs text-zinc-500">
                {selectedRestaurant.tagline}
              </p>
            </div>

            {/* Search Input */}
            <div className="relative sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search food & drinks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-zinc-900 text-white font-semibold'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                {cat === 'all' ? 'All Specialties' : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Food Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isAdded = addedItemId === item.item_id;
          return (
            <div
              key={item.item_id}
              className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col hover:border-zinc-300 transition-all hover:shadow-sm"
            >
              <div className="h-48 overflow-hidden relative bg-zinc-100">
                <img
                  src={item.image}
                  alt={item.item_name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 bg-zinc-950/80 backdrop-blur text-white text-xs font-bold px-2.5 py-1 rounded-md font-mono tabular-nums">
                  ${item.price.toFixed(2)}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-orange-600 font-medium mb-1">
                    {item.category}
                  </div>
                  <h4 className="text-base font-bold text-zinc-900 font-display">
                    {item.item_name}
                  </h4>
                  <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
                  <span className="text-sm font-extrabold text-zinc-900 font-mono tabular-nums">
                    ${item.price.toFixed(2)}
                  </span>

                  <button
                    onClick={() => handleAdd(item)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-orange-600 text-white hover:bg-orange-700 active:scale-95'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Order</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-500">No dishes found matching your search.</p>
        </div>
      )}
    </div>
  );
};
