import Link from 'next/link';

interface ProductCardProps {
    title: string;
    image: string;
    rating: number;
    reviews: number;
    price: number;
    prime?: boolean;
}

export default function ProductCard({ title, image, rating, reviews, price, prime = true }: ProductCardProps) {
    return (
        <div className="bg-white p-4 flex flex-col h-full relative border border-gray-100 rounded-md hover:shadow-lg transition-shadow">
            <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 mb-4 rounded-sm">
                {/* Placeholder for real image */}
                <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-gray-400 font-bold rounded-full">
                    {title.charAt(0)}
                </div>
            </div>

            <Link href="#" className="hover:text-retail-orange hover:underline text-sm font-medium line-clamp-2 mb-1 text-gray-900 leading-snug">
                {title}
            </Link>

            <div className="flex items-center gap-1 mb-1">
                <div className="flex text-retail-yellow text-sm">
                    {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < Math.floor(rating) ? "text-retail-orange" : "text-gray-300"}>★</span>
                    ))}
                </div>
                <span className="text-xs text-retail-link hover:underline cursor-pointer">{reviews}</span>
            </div>

            <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-xs align-top relative top-0.5">$</span>
                <span className="text-2xl font-medium text-gray-900">{Math.floor(price)}</span>
                <span className="text-xs align-top relative top-0.5">{Math.round((price % 1) * 100).toString().padEnd(2, '0')}</span>
            </div>

            {prime && (
                <div className="flex items-center gap-1 mb-2">
                    <span className="text-xs text-cyan-600 font-bold italic">prime</span>
                    <span className="text-xs text-gray-500">Two-Day</span>
                </div>
            )}

            <button className="w-full bg-retail-button hover:bg-retail-buttonHover text-xs font-medium py-1.5 rounded-full mt-auto shadow-sm border border-yellow-400">
                Add to Cart
            </button>
        </div>
    );
}
