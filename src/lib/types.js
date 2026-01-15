// lib/types.js
// Type definitions as JSDoc comments for JavaScript

/**
 * @typedef {Object} Trip
 * @property {string} [id]
 * @property {string} ownerId
 * @property {string} name - Trip Title
 * @property {string} city - Destination city
 * @property {string|null} [state] - Destination state (optional)
 * @property {string} country - Destination country
 * @property {string|null} [originCity]
 * @property {string|null} [originState]
 * @property {string|null} [originCountry]
 * @property {string|null} [originAddress]
 * @property {string|null} [originTransportationType] - Mode of transportation from origin
 * @property {string|null} [transportationType] - Deprecated - use originTransportationType instead
 * @property {string|null} [cruiseLine] - Cruise line name (when originTransportationType is "Cruise")
 * @property {string|null} [cruiseShip] - Ship name (when originTransportationType is "Cruise")
 * @property {string|null} [accommodationType]
 * @property {string|null} [specificAddress]
 * @property {number|null} [totalMiles] - Total miles traveled
 * @property {string} startDate - ISO yyyy-MM-dd
 * @property {string} endDate - ISO yyyy-MM-dd
 * @property {string|null} [description]
 * @property {string|null} [coverMediaId]
 * @property {{x: number, y: number}} [coverFocus]
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} MediaItem
 * @property {string} [id]
 * @property {string} tripId
 * @property {string} ownerId
 * @property {'image'|'video'} type
 * @property {string} storagePath
 * @property {string} downloadURL
 * @property {string|null} [thumbURL]
 * @property {number|null} [width]
 * @property {number|null} [height]
 * @property {number|null} [durationSec]
 * @property {string} [caption]
 * @property {number} createdAt
 */

/**
 * @typedef {'trialing'|'active'|'past_due'|'canceled'|'incomplete'|'incomplete_expired'} SubscriptionStatus
 */

/**
 * @typedef {Object} UserSubscription
 * @property {SubscriptionStatus} status
 * @property {string} [stripeCustomerId]
 * @property {string} [stripeSubscriptionId]
 * @property {'trial'|'monthly'|'annual'} [plan]
 * @property {number} [currentPeriodEnd]
 * @property {boolean} [cancelAtPeriodEnd]
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} uid
 * @property {string|null} [email]
 * @property {string} username - required & editable
 * @property {string|null} [photoURL]
 * @property {'admin'|'user'} [role] - optional role field for admin access
 * @property {UserSubscription} [subscription] - Stripe subscription data
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {'8x11'|'8x10'|'7x10'} PageSize
 */

/**
 * @typedef {'looseleaf'|'hardcover'} BindingType
 */

/**
 * @typedef {'single-full'|'two-horizontal'|'two-vertical'|'three-mixed-left'|'three-mixed-right'|'four-grid'|'six-collage'|'blank'} LayoutType
 */

/**
 * @typedef {Object} PhotoPosition
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} rotation
 */

/**
 * @typedef {Object} PhotoCrop
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} PagePhoto
 * @property {string} mediaId
 * @property {number} slotIndex - which slot in the layout (0, 1, 2, etc.)
 * @property {PhotoPosition} position
 * @property {PhotoCrop|null} [cropBox]
 */

/**
 * @typedef {Object} TextBox
 * @property {string} id
 * @property {string} text
 * @property {PhotoPosition} position
 * @property {number} fontSize
 * @property {string} fontFamily
 * @property {string} color
 * @property {'left'|'center'|'right'} align
 */

/**
 * @typedef {Object} PhotobookPage
 * @property {number} pageNumber
 * @property {LayoutType} layoutId
 * @property {string} backgroundColor
 * @property {string|null} [backgroundPattern]
 * @property {PagePhoto[]} photos
 * @property {TextBox[]} textBoxes
 */

/**
 * @typedef {Object} Photobook
 * @property {string} [id]
 * @property {string} tripId
 * @property {string} ownerId
 * @property {string} title
 * @property {PageSize} pageSize
 * @property {BindingType} binding
 * @property {PhotobookPage[]} pages
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * @typedef {'Activities'|'Accommodations'|'Restaurants'|'Destinations'|'Cruises'} ReviewType
 */

/**
 * @typedef {Object} Review
 * @property {string} [id]
 * @property {string} tripId
 * @property {string} ownerId
 * @property {string} [ownerName]
 * @property {ReviewType} type
 * @property {string} placeName
 * @property {string} city
 * @property {string|null} [state]
 * @property {string} country
 * @property {string|null} [address]
 * @property {{overall?: number, cleanliness?: number, comfort?: number, value?: number, service?: number, safety?: number, organization?: number, funFactor?: number}} ratings
 * @property {string|null} [notes]
 * @property {string|null} [coverMediaId]
 * @property {string[]} [mediaIds]
 * @property {string|null} [visitDate] - ISO date
 * @property {number} createdAt
 * @property {number} updatedAt
 */

export default {};
