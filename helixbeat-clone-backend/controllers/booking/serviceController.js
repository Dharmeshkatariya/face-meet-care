// controllers/booking/serviceController.js

const Service = require('../../models/booking/Service');

class ServiceController {

    /**
     * Get all services with pagination, search, and filters
     */
    async getAllServices(req, res) {
        try {
            const {
                category,
                sub_category,
                search,
                min_price,
                max_price,
                min_rating,
                sort_by = 'rating',
                sort_order = 'desc',
                page = 1,
                limit = 50
            } = req.query;

            // Build query
            const query = { is_active: true };

            if (category) {
                query.category = { $regex: category, $options: 'i' };
            }

            if (sub_category) {
                query.sub_category = { $regex: sub_category, $options: 'i' };
            }

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { category: { $regex: search, $options: 'i' } }
                ];
            }

            if (min_price || max_price) {
                query.base_price = {};
                if (min_price) query.base_price.$gte = parseFloat(min_price);
                if (max_price) query.base_price.$lte = parseFloat(max_price);
            }

            if (min_rating) {
                query.rating = { $gte: parseFloat(min_rating) };
            }

            // Count total
            const total = await Service.countDocuments(query);

            // Sort options
            const sortOptions = {};
            switch (sort_by) {
                case 'price':
                    sortOptions.base_price = sort_order === 'asc' ? 1 : -1;
                    break;
                case 'name':
                    sortOptions.name = sort_order === 'asc' ? 1 : -1;
                    break;
                case 'rating':
                default:
                    sortOptions.rating = -1;
                    sortOptions.total_reviews = -1;
                    break;
            }

            // Fetch services
            const services = await Service.find(query)
                .sort(sortOptions)
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .select('-__v');

            res.json({
                status: true,
                data: services,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    total_pages: Math.ceil(total / parseInt(limit)),
                    has_next: parseInt(page) * parseInt(limit) < total,
                    has_prev: parseInt(page) > 1
                }
            });
        } catch (error) {
            console.error('Get services error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get service by ID
     */
    async getServiceById(req, res) {
        try {
            const { serviceId } = req.params;

            const service = await Service.findOne({
                $or: [
                    { service_id: serviceId },
                    { _id: serviceId }
                ],
                is_active: true
            });

            if (!service) {
                return res.status(404).json({
                    status: false,
                    message: 'Service not found'
                });
            }

            res.json({ status: true, data: service });
        } catch (error) {
            console.error('Get service error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get all service categories
     */
    async getCategories(req, res) {
        try {
            const categories = await Service.aggregate([
                { $match: { is_active: true } },
                { $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    image: { $first: '$image_url' }
                }},
                { $sort: { count: -1 } }
            ]);

            const result = categories.map(c => ({
                name: c._id,
                count: c.count,
                image: c.image
            }));

            res.json({ status: true, data: result });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get featured services
     */
    async getFeaturedServices(req, res) {
        try {
            const services = await Service.find({ is_active: true, rating: { $gte: 4.5 } })
                .sort({ rating: -1, total_reviews: -1 })
                .limit(6)
                .select('-__v');

            res.json({ status: true, data: services });
        } catch (error) {
            console.error('Get featured error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get popular services
     */
    async getPopularServices(req, res) {
        try {
            const services = await Service.find({ is_active: true })
                .sort({ total_reviews: -1, rating: -1 })
                .limit(8)
                .select('-__v');

            res.json({ status: true, data: services });
        } catch (error) {
            console.error('Get popular error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Search services
     */
    async searchServices(req, res) {
        try {
            const { q, limit = 20 } = req.query;

            if (!q || q.trim().length === 0) {
                return res.json({ status: true, data: [], query: q });
            }

            const services = await Service.find({
                is_active: true,
                $or: [
                    { name: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } },
                    { category: { $regex: q, $options: 'i' } },
                    { sub_category: { $regex: q, $options: 'i' } }
                ]
            })
            .limit(parseInt(limit))
            .select('service_id name category base_price rating image_url');

            res.json({ status: true, data: services, query: q, total: services.length });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get providers for a service
     */
    async getServiceProviders(req, res) {
        try {
            const { serviceId } = req.params;

            const service = await Service.findOne({
                $or: [{ service_id: serviceId }, { _id: serviceId }],
                is_active: true
            });

            if (!service) {
                return res.status(404).json({ status: false, message: 'Service not found' });
            }

            const providers = (service.providers || []).filter(p => p.is_available);

            res.json({
                status: true,
                data: {
                    service_id: service.service_id,
                    service_name: service.name,
                    providers,
                    total: providers.length
                }
            });
        } catch (error) {
            console.error('Get providers error:', error);
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get service reviews
     */
    async getServiceReviews(req, res) {
        try {
            const { serviceId } = req.params;
            const { page = 1, limit = 20 } = req.query;

            // In production, fetch from reviews collection
            const mockReviews = [
                { id: 1, user_name: 'Rahul S.', rating: 5, comment: 'Excellent service! Very professional.', date: '2026-05-01' },
                { id: 2, user_name: 'Priya M.', rating: 4, comment: 'Good work, on time delivery.', date: '2026-04-28' },
                { id: 3, user_name: 'Amit K.', rating: 5, comment: 'Best cleaning service I have used.', date: '2026-04-25' }
            ];

            res.json({
                status: true,
                data: {
                    service_id: serviceId,
                    reviews: mockReviews,
                    average_rating: 4.7,
                    total_reviews: 256
                }
            });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get service FAQs
     */
    async getServiceFAQs(req, res) {
        try {
            const { serviceId } = req.params;

            const faqs = [
                { question: 'How long does the service take?', answer: 'Typically 1-2 hours depending on the size.' },
                { question: 'Do I need to provide equipment?', answer: 'No, the provider brings all necessary equipment.' },
                { question: 'Can I reschedule?', answer: 'Yes, free reschedule up to 24 hours before service.' }
            ];

            res.json({ status: true, data: { service_id: serviceId, faqs } });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }

    /**
     * Get service pricing details
     */
    async getServicePricing(req, res) {
        try {
            const { serviceId } = req.params;

            const service = await Service.findOne({
                $or: [{ service_id: serviceId }, { _id: serviceId }],
                is_active: true
            });

            if (!service) {
                return res.status(404).json({ status: false, message: 'Service not found' });
            }

            const pricing = {
                base_price: service.base_price,
                price_unit: service.price_unit,
                peak_hours: service.peak_hours || [],
                addons: service.addons || [],
                tax_percentage: 18,
                insurance_percentage: 5
            };

            res.json({ status: true, data: { service_id: service.service_id, pricing } });
        } catch (error) {
            res.status(500).json({ status: false, message: error.message });
        }
    }
}

module.exports = new ServiceController();