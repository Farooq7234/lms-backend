import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Lead from "../models/lead.model.js";

const createLead = asyncHandler(async (req, res) => {
    const {
        first_name,
        last_name,
        email,
        phone,
        company,
        city,
        state,
        source,
        status,
        score = 0,
        lead_value,
        last_activity_at = null,
        is_qualified = false
    } = req.body;
    
    if (
        [first_name, last_name, email, phone, company, city, state, source, status, lead_value].some(
            (field) => field === undefined || field === null || (typeof field === 'string' && field.trim() === "")
        )
    ) {
        throw new ApiError(400, "Please provide all required fields.");
    }

    const lead = await Lead.create({
        first_name,
        last_name,
        email,
        phone,
        company,
        city,
        state,
        source,
        status,
        score,
        lead_value,
        last_activity_at,
        is_qualified
    });

    return res.status(201).json(new ApiResponse(201, lead, "Lead created successfully"));
});

const getLeads = asyncHandler(async (req, res) => {
    // Pagination
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    let limit = parseInt(req.query.limit, 10) || 20;
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 20;

    // Filtering
    const filter = {};

    const parseBoolean = (value) => {
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            const v = value.toLowerCase();
            if (v === "true") return true;
            if (v === "false") return false;
        }
        return undefined;
    };

    const parseNumber = (value) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
    };

    const parseDate = (value) => {
        const d = new Date(value);
        return isNaN(d.getTime()) ? undefined : d;
    };

    // String fields: equals, contains
    const stringFields = ["email", "company", "city"];
    for (const field of stringFields) {
        const eqVal = req.query[field];
        const containsVal = req.query[`${field}_contains`];
        if (eqVal && typeof eqVal === "string") {
            filter[field] = eqVal;
        } else if (containsVal && typeof containsVal === "string") {
            filter[field] = { $regex: containsVal, $options: "i" };
        }
    }

    // Enums: equals, in
    const enumFields = ["status", "source"];
    for (const field of enumFields) {
        const eqVal = req.query[field];
        const inVal = req.query[`${field}_in`];
        if (eqVal && typeof eqVal === "string") {
            filter[field] = eqVal;
        } else if (inVal && typeof inVal === "string") {
            const parts = inVal.split(",").map((s) => s.trim()).filter(Boolean);
            if (parts.length > 0) {
                filter[field] = { $in: parts };
            }
        }
    }

    // Numbers: equals, gt, lt, between
    const numberFields = ["score", "lead_value"];
    for (const field of numberFields) {
        const eqVal = parseNumber(req.query[field]);
        const gtVal = parseNumber(req.query[`${field}_gt`]);
        const ltVal = parseNumber(req.query[`${field}_lt`]);
        const betweenVal = req.query[`${field}_between`]; // "min,max"

        if (eqVal !== undefined) {
            filter[field] = eqVal;
        } else {
            const range = {};
            if (gtVal !== undefined) range.$gt = gtVal;
            if (ltVal !== undefined) range.$lt = ltVal;
            if (betweenVal && typeof betweenVal === "string") {
                const [minStr, maxStr] = betweenVal.split(",").map((s) => s.trim());
                const min = parseNumber(minStr);
                const max = parseNumber(maxStr);
                if (min !== undefined) range.$gte = min;
                if (max !== undefined) range.$lte = max;
            }
            if (Object.keys(range).length > 0) {
                filter[field] = range;
            }
        }
    }

    // Dates: on, before, after, between
    const dateFields = ["created_at", "last_activity_at"];
    for (const field of dateFields) {
        const onVal = req.query[`${field}_on`];
        const beforeVal = req.query[`${field}_before`];
        const afterVal = req.query[`${field}_after`];
        const betweenVal = req.query[`${field}_between`]; // "start,end"

        const range = {};
        if (onVal) {
            const d = parseDate(onVal);
            if (d) {
                const start = new Date(d);
                start.setHours(0, 0, 0, 0);
                const end = new Date(d);
                end.setHours(23, 59, 59, 999);
                filter[field] = { $gte: start, $lte: end };
                continue; // exact day set, skip other operators
            }
        }
        if (beforeVal) {
            const d = parseDate(beforeVal);
            if (d) range.$lt = d;
        }
        if (afterVal) {
            const d = parseDate(afterVal);
            if (d) range.$gt = d;
        }
        if (betweenVal && typeof betweenVal === "string") {
            const [fromStr, toStr] = betweenVal.split(",").map((s) => s.trim());
            const from = parseDate(fromStr);
            const to = parseDate(toStr);
            if (from) range.$gte = from;
            if (to) range.$lte = to;
        }
        if (Object.keys(range).length > 0) {
            filter[field] = range;
        }
    }

    // Boolean: equals
    if (req.query.is_qualified !== undefined) {
        const bool = parseBoolean(req.query.is_qualified);
        if (bool !== undefined) {
            filter.is_qualified = bool;
        }
    }

    const total = await Lead.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const skip = (page - 1) * limit;

    const leads = await Lead.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

    return res.status(200).json({
        data: leads,
        page,
        limit,
        total,
        totalPages,
    });
});

const getLeadById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Lead id is required");
    }

    const lead = await Lead.findById(id);
    if (!lead) {
        throw new ApiError(404, "Lead not found");
    }

    return res.status(200).json(new ApiResponse(200, lead, "Lead fetched successfully"));
});

const updateLead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    console.log("➡️ Update request received");
    console.log("Lead ID from params:", id);
    console.log("Request body:", req.body);

    if (!id) {
        console.error("❌ Lead id is missing");
        throw new ApiError(400, "Lead id is required");
    }

    const updatableFields = [
        "first_name",
        "last_name",
        "email",
        "phone",
        "company",
        "city",
        "state",
        "source",
        "status",
        "score",
        "lead_value",
        "last_activity_at",
        "is_qualified",
    ];

    const updatePayload = {};
    for (const field of updatableFields) {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) {
            updatePayload[field] = req.body[field];
        }
    }

    console.log("✅ Fields allowed for update:", updatableFields);
    console.log("📝 Final update payload:", updatePayload);

    if (Object.keys(updatePayload).length === 0) {
        console.warn("⚠️ No valid fields provided for update");
        throw new ApiError(400, "No valid fields provided for update");
    }

    const updatedLead = await Lead.findByIdAndUpdate(id, updatePayload, {
        new: true,
        runValidators: true,
        context: "query",
    });

    console.log("🔍 Result after update:", updatedLead);

    if (!updatedLead) {
        console.error("❌ Lead not found with ID:", id);
        throw new ApiError(404, "Lead not found");
    }

    console.log("✅ Lead updated successfully");
    return res
        .status(200)
        .json(new ApiResponse(200, updatedLead, "Lead updated successfully"));
});


const deleteLead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Lead id is required");
    }

    const deleted = await Lead.findByIdAndDelete(id);
    if (!deleted) {
        throw new ApiError(404, "Lead not found");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Lead deleted successfully"));
});

export {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    deleteLead,
};
