"use strict";

/* =========================================================
   AL JAZEERA BOOKING SYSTEM
========================================================= */

const API_URL = "http://localhost:3000/api";

const VODAFONE_NUMBER = "01121572167";
const ADMIN_PASSWORD = "2026";

let settings = {
    smallPrice: 0,
    largePrice: 0,
    openTime: "12:00",
    closeTime: "03:00"
};

let bookings = [];
let currentBooking = null;


/* =========================================================
   HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}


function money(value) {
    return Number(value || 0).toLocaleString("ar-EG") + " جنيه";
}


function pitchName(type) {
    return type === "small"
        ? "الملعب الصغير"
        : "الملعب الكبير";
}


function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   API
========================================================= */

async function apiRequest(endpoint, options = {}) {

    try {

        const response = await fetch(
            API_URL + endpoint,
            options
        );

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {

            throw new Error(
                data.message ||
                `خطأ من السيرفر (${response.status})`
            );
        }

        return data;

    } catch (error) {

        console.error(
            "API REQUEST ERROR:",
            endpoint,
            error
        );

        if (
            error instanceof TypeError &&
            error.message.includes("fetch")
        ) {

            throw new Error(
                "تعذر الاتصال بالسيرفر. تأكد أن Backend يعمل على Port 3000."
            );

        }

        throw error;
    }
}


/* =========================================================
   SERVER TEST
========================================================= */

async function checkServerConnection() {

    try {

        const data =
            await apiRequest("/health");

        console.log(
            "Server connected:",
            data
        );

        return true;

    } catch (error) {

        console.error(
            "Server connection failed:",
            error
        );

        return false;
    }
}


/* =========================================================
   SETTINGS
========================================================= */

async function loadSettings() {

    try {

        const data =
            await apiRequest("/settings");

        if (data.settings) {

            settings = {
                ...settings,
                ...data.settings
            };

        }

        updatePitchPrices();

        return true;

    } catch (error) {

        console.error(
            "Settings error:",
            error
        );

        updatePitchPrices();

        return false;
    }
}


/* =========================================================
   BOOKINGS
========================================================= */

async function loadBookings() {

    try {

        const data =
            await apiRequest("/bookings");

        bookings =
            Array.isArray(data.bookings)
                ? data.bookings
                : [];

        return true;

    } catch (error) {

        console.error(
            "Bookings error:",
            error
        );

        bookings = [];

        return false;
    }
}


/* =========================================================
   PITCH PRICES
========================================================= */

function updatePitchPrices() {

    const prices =
        document.querySelectorAll(".pitch-price");

    if (prices.length < 2)
        return;

    prices[0].textContent =
        Number(settings.smallPrice) > 0
            ? money(settings.smallPrice) + " / ساعة"
            : "السعر تحدده الإدارة";

    prices[1].textContent =
        Number(settings.largePrice) > 0
            ? money(settings.largePrice) + " / ساعة"
            : "السعر تحدده الإدارة";
}


/* =========================================================
   TIME
========================================================= */

function timeToMinutes(time) {

    if (!time || !time.includes(":"))
        return 0;

    const [h, m] =
        time.split(":").map(Number);

    return h * 60 + m;
}


function minutesToTime(total) {

    total =
        ((total % 1440) + 1440) % 1440;

    const h =
        Math.floor(total / 60);

    const m =
        total % 60;

    return (
        String(h).padStart(2, "0") +
        ":" +
        String(m).padStart(2, "0")
    );
}


function formatTime(time) {

    if (!time)
        return "--";

    const [h, m] =
        time.split(":").map(Number);

    const suffix =
        h >= 12 ? "م" : "ص";

    let hour =
        h % 12;

    if (hour === 0)
        hour = 12;

    return (
        `${hour}:${String(m).padStart(2, "0")} ${suffix}`
    );
}


function timelineMinutes(time) {

    let minutes =
        timeToMinutes(time);

    if (minutes < 12 * 60)
        minutes += 1440;

    return minutes;
}


/* =========================================================
   DATE
========================================================= */

function getTodayLocal() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(now.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function setupDateField() {

    const date =
        $("bookingDate");

    if (!date)
        return;

    date.min =
        getTodayLocal();
}


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {

    const modal =
        $(id);

    if (!modal)
        return;

    modal.classList.add("active");
}


function closeModal(id) {

    const modal =
        $(id);

    if (!modal)
        return;

    modal.classList.remove("active");
}


/* =========================================================
   OPEN BOOKING
========================================================= */

async function openBooking(type) {

    await loadSettings();
    await loadBookings();

    const form =
        $("bookingForm");

    if (form)
        form.reset();

    if ($("pitchType"))
        $("pitchType").value = type;

    if ($("selectedPitch"))
        $("selectedPitch").textContent =
            pitchName(type);

    const price =
        Number(
            settings[
                type === "small"
                    ? "smallPrice"
                    : "largePrice"
            ] || 0
        );

    if ($("bookingPrice")) {

        $("bookingPrice").textContent =
            price > 0
                ? money(price) + " / ساعة"
                : "يحدد من الإدارة";
    }

    if ($("matchDuration"))
        $("matchDuration").textContent = "—";

    if ($("timeAvailability"))
        $("timeAvailability").innerHTML = "";

    if ($("availableTimes"))
        $("availableTimes").innerHTML = "";

    setupDateField();

    openModal("bookingModal");
}


/* =========================================================
   CLOSE BOOKING
========================================================= */

function closeBooking() {
    closeModal("bookingModal");
}


/* =========================================================
   WORKING HOURS
========================================================= */

function isInsideWorkingHours(start, end) {

    let open =
        timelineMinutes(settings.openTime);

    let close =
        timelineMinutes(settings.closeTime);

    if (close <= open)
        close += 1440;

    return (
        start >= open &&
        end <= close
    );
}


/* =========================================================
   CHECK MATCH TIME
========================================================= */

async function checkMatchTime() {

    const type =
        $("pitchType")?.value;

    const date =
        $("bookingDate")?.value;

    const start =
        $("manualStartTime")?.value;

    const end =
        $("manualEndTime")?.value;

    const result =
        $("timeAvailability");

    const alternatives =
        $("availableTimes");

    if (result)
        result.innerHTML = "";

    if (alternatives)
        alternatives.innerHTML = "";

    if (!date || !start || !end) {

        if ($("matchDuration"))
            $("matchDuration").textContent = "—";

        return false;
    }

    let startMin =
        timelineMinutes(start);

    let endMin =
        timelineMinutes(end);

    if (endMin <= startMin)
        endMin += 1440;

    const durationHours =
        (endMin - startMin) / 60;

    if ($("matchDuration")) {

        $("matchDuration").textContent =
            Number.isInteger(durationHours)
                ? `${durationHours} ساعة`
                : `${durationHours.toFixed(1)} ساعة`;
    }

    if (
        durationHours < 1 ||
        durationHours > 8
    ) {

        if (result) {

            result.innerHTML = `
                <div class="availability rejected">
                    ❌ مدة الحجز لازم تكون من ساعة إلى 8 ساعات.
                </div>
            `;
        }

        return false;
    }

    if (
        !isInsideWorkingHours(
            startMin,
            endMin
        )
    ) {

        if (result) {

            result.innerHTML = `
                <div class="availability rejected">

                    ❌ الوقت خارج مواعيد العمل.

                    <br>

                    المتاح من
                    ${formatTime(settings.openTime)}
                    إلى
                    ${formatTime(settings.closeTime)}.

                </div>
            `;
        }

        return false;
    }

    const activeBookings =
        bookings.filter(b =>

            b.status !== "cancelled" &&
            b.status !== "rejected" &&
            b.pitchType === type &&
            b.date === date
        );

    const overlap =
        activeBookings.some(b => {

            let existingStart =
                timelineMinutes(
                    b.startTime
                );

            let existingEnd =
                timelineMinutes(
                    b.endTime
                );

            if (existingEnd <= existingStart)
                existingEnd += 1440;

            return (
                startMin < existingEnd &&
                endMin > existingStart
            );
        });

    if (overlap) {

        if (result) {

            result.innerHTML = `
                <div class="availability rejected">

                    <strong>
                        مرفوض ❌
                    </strong>

                    <br>

                    الوقت ده متحجز بالفعل
                    أو متداخل مع حجز موجود.

                </div>
            `;
        }

        showAvailableTimes(
            type,
            date,
            durationHours
        );

        return false;
    }

    if (result) {

        result.innerHTML = `
            <div class="availability available">

                <strong>
                    متاح ✓
                </strong>

                <br>

                ${formatTime(start)}
                →
                ${formatTime(end)}

                —
                ${durationHours} ساعة

            </div>
        `;
    }

    return true;
}


/* =========================================================
   AVAILABLE TIMES
========================================================= */

function showAvailableTimes(
    type,
    date,
    duration
) {

    const container =
        $("availableTimes");

    if (!container)
        return;

    if (!date || !duration)
        return;

    const durationMin =
        duration * 60;

    let open =
        timelineMinutes(
            settings.openTime
        );

    let close =
        timelineMinutes(
            settings.closeTime
        );

    if (close <= open)
        close += 1440;

    let output = `
        <div class="available-title">
            🕐 المواعيد المتاحة:
        </div>
    `;

    let found = 0;

    for (
        let start = open;
        start + durationMin <= close;
        start += 60
    ) {

        const end =
            start + durationMin;

        const startText =
            minutesToTime(start);

        const endText =
            minutesToTime(end);

        const overlap =
            bookings.some(b => {

                if (
                    b.status === "cancelled" ||
                    b.status === "rejected"
                )
                    return false;

                if (
                    b.pitchType !== type ||
                    b.date !== date
                )
                    return false;

                let bs =
                    timelineMinutes(
                        b.startTime
                    );

                let be =
                    timelineMinutes(
                        b.endTime
                    );

                if (be <= bs)
                    be += 1440;

                return (
                    start < be &&
                    end > bs
                );
            });

        if (!overlap) {

            found++;

            output += `
                <button
                    type="button"
                    onclick="selectAvailableTime('${startText}','${endText}')">

                    ${formatTime(startText)}
                    →
                    ${formatTime(endText)}

                </button>
            `;

            if (found >= 8)
                break;
        }
    }

    if (!found) {

        output += `
            <span>
                لا توجد مواعيد متاحة بهذه المدة.
            </span>
        `;
    }

    container.innerHTML =
        output;
}


function selectAvailableTime(start, end) {

    if ($("manualStartTime"))
        $("manualStartTime").value = start;

    if ($("manualEndTime"))
        $("manualEndTime").value = end;

    checkMatchTime();
}


/* =========================================================
   BOOKING FORM
========================================================= */

const bookingForm =
    $("bookingForm");

if (bookingForm) {

    bookingForm.addEventListener(
        "submit",
        async function(e) {

            e.preventDefault();

            await loadSettings();
            await loadBookings();

            const valid =
                await checkMatchTime();

            if (!valid) {

                alert(
                    "الوقت غير متاح أو غير صحيح ❌"
                );

                return;
            }

            const type =
                $("pitchType").value;

            const start =
                $("manualStartTime").value;

            const end =
                $("manualEndTime").value;

            let startMinutes =
                timelineMinutes(start);

            let endMinutes =
                timelineMinutes(end);

            if (endMinutes <= startMinutes)
                endMinutes += 1440;

            const duration =
                (
                    endMinutes -
                    startMinutes
                ) / 60;

            const pricePerHour =
                Number(
                    settings[
                        type === "small"
                            ? "smallPrice"
                            : "largePrice"
                    ] || 0
                );

            if (pricePerHour <= 0) {

                alert(
                    "الإدارة لم تحدد سعر هذا الملعب حتى الآن."
                );

                return;
            }

            currentBooking = {

                name:
                    $("customerName")
                        .value
                        .trim(),

                phone:
                    $("customerPhone")
                        .value
                        .trim(),

                pitchType:
                    type,

                pitchName:
                    pitchName(type),

                date:
                    $("bookingDate")
                        .value,

                startTime:
                    start,

                endTime:
                    end,

                duration:
                    duration,

                price:
                    pricePerHour * duration
            };

            if ($("transferFrom"))
                $("transferFrom").value = "";

            if ($("paymentProof"))
                $("paymentProof").value = "";

            if ($("proofPreview"))
                $("proofPreview").innerHTML = "";

            closeBooking();

            openModal("paymentModal");
        }
    );
}


/* =========================================================
   PAYMENT PREVIEW
========================================================= */

const paymentProof =
    $("paymentProof");

if (paymentProof) {

    paymentProof.addEventListener(
        "change",
        function() {

            const file =
                this.files[0];

            if (!file)
                return;

            if (!file.type.startsWith("image/")) {

                alert(
                    "اختار صورة فقط."
                );

                this.value = "";

                return;
            }

            if (file.size > 5 * 1024 * 1024) {

                alert(
                    "حجم الصورة لازم يكون أقل من 5MB."
                );

                this.value = "";

                return;
            }

            const reader =
                new FileReader();

            reader.onload =
                function(e) {

                    if ($("proofPreview")) {

                        $("proofPreview").innerHTML = `
                            <img
                                src="${e.target.result}"
                                alt="إثبات التحويل">
                        `;
                    }
                };

            reader.readAsDataURL(file);
        }
    );
}


/* =========================================================
   SEND BOOKING
========================================================= */

const paymentForm =
    $("paymentForm");

if (paymentForm) {

    paymentForm.addEventListener(
        "submit",
        async function(e) {

            e.preventDefault();

            if (!currentBooking)
                return;

            const transferFrom =
                $("transferFrom")
                    .value
                    .trim();

            const file =
                $("paymentProof")
                    .files[0];

            if (!transferFrom) {

                alert(
                    "اكتب الرقم اللي حولت منه."
                );

                return;
            }

            if (!file) {

                alert(
                    "ارفع صورة إثبات التحويل."
                );

                return;
            }

            try {

                const formData =
                    new FormData();

                formData.append(
                    "name",
                    currentBooking.name
                );

                formData.append(
                    "phone",
                    currentBooking.phone
                );

                formData.append(
                    "pitchType",
                    currentBooking.pitchType
                );

                formData.append(
                    "date",
                    currentBooking.date
                );

                formData.append(
                    "startTime",
                    currentBooking.startTime
                );

                formData.append(
                    "endTime",
                    currentBooking.endTime
                );

                formData.append(
                    "duration",
                    currentBooking.duration
                );

                formData.append(
                    "transferFrom",
                    transferFrom
                );

                formData.append(
                    "paymentProof",
                    file
                );

                const response =
                    await fetch(
                        API_URL + "/bookings",
                        {
                            method: "POST",
                            body: formData
                        }
                    );

                let data = {};

                try {
                    data =
                        await response.json();
                } catch {
                    data = {};
                }

                if (!response.ok) {

                    throw new Error(
                        data.message ||
                        "فشل إرسال الحجز."
                    );
                }

                if (!data.booking) {

                    throw new Error(
                        "السيرفر لم يرجع بيانات الحجز."
                    );
                }

                currentBooking =
                    data.booking;

                if ($("generatedCode")) {

                    $("generatedCode").textContent =
                        currentBooking.code;
                }

                closePayment();

                openModal("successModal");

                sendWhatsAppNotification(
                    currentBooking
                );

                await loadBookings();

            } catch (error) {

                console.error(
                    "Booking submit error:",
                    error
                );

                alert(
                    error.message ||
                    "حدث خطأ أثناء إرسال الحجز."
                );
            }
        }
    );
}


/* =========================================================
   TRACKING
========================================================= */

async function trackBooking() {

    const input =
        $("trackingCode");

    const result =
        $("trackingResult");

    if (!input || !result)
        return;

    const code =
        input.value
            .trim()
            .toUpperCase();

    if (!code) {

        result.innerHTML = `
            <div>
                اكتب كود الحجز أولًا.
            </div>
        `;

        return;
    }

    try {

        const data =
            await apiRequest(
                `/bookings/${encodeURIComponent(code)}`
            );

        const booking =
            data.booking;

        let statusText =
            "في انتظار تأكيد الإدارة ⏳";

        if (
            booking.status === "confirmed"
        ) {

            statusText =
                "تم تأكيد الحجز ✅";
        }

        if (
            booking.status === "cancelled" ||
            booking.status === "rejected"
        ) {

            statusText =
                "تم إلغاء / رفض الحجز ❌";
        }

        result.innerHTML = `

            <div>

                <strong>
                    ${escapeHTML(booking.code)}
                </strong>

                <div class="track-status">

                    الملعب:
                    ${escapeHTML(booking.pitchName)}

                    <br>

                    التاريخ:
                    ${escapeHTML(booking.date)}

                    <br>

                    الوقت:
                    ${formatTime(booking.startTime)}
                    →
                    ${formatTime(booking.endTime)}

                    <br>

                    الحالة:
                    ${statusText}

                </div>

            </div>
        `;

    } catch (error) {

        console.error(
            "Tracking error:",
            error
        );

        result.innerHTML = `
            <div>
                ❌ الكود غير موجود أو حدث خطأ في السيرفر.
            </div>
        `;
    }
}


/* =========================================================
   PAYMENT
========================================================= */

function copyVodafone() {

    if (
        navigator.clipboard &&
        navigator.clipboard.writeText
    ) {

        navigator.clipboard
            .writeText(VODAFONE_NUMBER)
            .then(() => {

                alert(
                    "تم نسخ رقم فودافون كاش ✓"
                );

            })
            .catch(() => {

                alert(
                    "الرقم: " +
                    VODAFONE_NUMBER
                );
            });

    } else {

        alert(
            "الرقم: " +
            VODAFONE_NUMBER
        );
    }
}


function closePayment() {
    closeModal("paymentModal");
}


function closeSuccess() {
    closeModal("successModal");
}


/* =========================================================
   WHATSAPP
========================================================= */

function sendWhatsAppNotification(booking) {

    if (!booking)
        return;

    const message = `
طلب حجز جديد - AL JAZEERA ⚽

الكود:
${booking.code}

الاسم:
${booking.name}

رقم العميل:
${booking.phone}

الملعب:
${booking.pitchName}

التاريخ:
${booking.date}

الوقت:
${formatTime(booking.startTime)}
→
${formatTime(booking.endTime)}

المدة:
${booking.duration} ساعة

المبلغ:
${money(booking.price)}

الرقم المحول منه:
${booking.transferFrom}

الحالة:
في انتظار تأكيد الإدارة
`.trim();

    const url =
        "https://wa.me/201550060383?text=" +
        encodeURIComponent(message);

    window.open(
        url,
        "_blank"
    );
}


/* =========================================================
   ADMIN
========================================================= */

function openAdmin() {

    const panel =
        $("adminPanel");

    if (!panel)
        return;

    panel.classList.add("active");

    if ($("adminLogin")) {

        $("adminLogin")
            .classList
            .remove("hidden");
    }

    if ($("adminDashboard")) {

        $("adminDashboard")
            .classList
            .add("hidden");
    }

    if ($("adminPassword"))
        $("adminPassword").value = "";

    setTimeout(() => {

        if ($("adminPassword"))
            $("adminPassword").focus();

    }, 100);
}


function closeAdmin() {

    const panel =
        $("adminPanel");

    if (panel)
        panel.classList.remove("active");
}


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function adminLogin() {

    const password =
        $("adminPassword")?.value || "";

    if (
        password !== ADMIN_PASSWORD
    ) {

        alert(
            "كلمة المرور غلط ❌"
        );

        return;
    }

    if ($("adminLogin")) {

        $("adminLogin")
            .classList
            .add("hidden");
    }

    if ($("adminDashboard")) {

        $("adminDashboard")
            .classList
            .remove("hidden");
    }

    await loadSettings();

    await renderAdminBookings();
}


/* =========================================================
   ADMIN SETTINGS
========================================================= */

function loadAdminSettings() {

    if ($("smallPrice"))
        $("smallPrice").value =
            settings.smallPrice;

    if ($("largePrice"))
        $("largePrice").value =
            settings.largePrice;

    if ($("adminOpenTime"))
        $("adminOpenTime").value =
            settings.openTime;

    if ($("adminCloseTime"))
        $("adminCloseTime").value =
            settings.closeTime;
}


async function saveAdminSettings() {

    const smallPrice =
        Number(
            $("smallPrice")?.value || 0
        );

    const largePrice =
        Number(
            $("largePrice")?.value || 0
        );

    const openTime =
        $("adminOpenTime")?.value ||
        "12:00";

    const closeTime =
        $("adminCloseTime")?.value ||
        "03:00";

    if (
        !Number.isFinite(smallPrice) ||
        !Number.isFinite(largePrice) ||
        smallPrice < 0 ||
        largePrice < 0
    ) {

        alert(
            "السعر لازم يكون رقم صحيح."
        );

        return;
    }

    if (
        !/^\d{2}:\d{2}$/.test(openTime) ||
        !/^\d{2}:\d{2}$/.test(closeTime)
    ) {

        alert(
            "اكتب مواعيد العمل بصيغة صحيحة."
        );

        return;
    }

    const newSettings = {

        smallPrice,
        largePrice,
        openTime,
        closeTime
    };

    try {

        const data =
            await apiRequest(
                "/settings",
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            newSettings
                        )
                }
            );

        settings = {
            ...settings,
            ...(data.settings || newSettings)
        };

        updatePitchPrices();

        loadAdminSettings();

        alert(
            "تم حفظ إعدادات الملاعب ✓"
        );

    } catch (error) {

        console.error(
            "Save settings error:",
            error
        );

        alert(
            error.message ||
            "حدث خطأ في اتصال السيرفر."
        );
    }
}


/* =========================================================
   ADMIN BOOKINGS
========================================================= */

async function renderAdminBookings() {

    try {

        await loadBookings();

        const container =
            $("adminBookingsList");

        if (!container)
            return;

        const pending =
            bookings.filter(
                b =>
                    b.status === "pending"
            ).length;

        const confirmed =
            bookings.filter(
                b =>
                    b.status === "confirmed"
            ).length;

        if ($("adminBookingCount")) {

            $("adminBookingCount")
                .textContent =
                bookings.length;
        }

        if ($("adminPendingCount")) {

            $("adminPendingCount")
                .textContent =
                pending;
        }

        if ($("adminConfirmedCount")) {

            $("adminConfirmedCount")
                .textContent =
                confirmed;
        }

        loadAdminSettings();

        if (!bookings.length) {

            container.innerHTML = `
                <div class="admin-booking">
                    لا توجد حجوزات حتى الآن.
                </div>
            `;

            return;
        }

        const sorted =
            [...bookings].reverse();

        container.innerHTML =
            sorted.map(b => {

                let status =
                    "في الانتظار ⏳";

                if (
                    b.status === "confirmed"
                ) {

                    status =
                        "مؤكد ✅";
                }

                if (
                    b.status === "cancelled" ||
                    b.status === "rejected"
                ) {

                    status =
                        "ملغي ❌";
                }

                return `

                    <div class="admin-booking">

                        <div class="admin-booking-top">

                            <strong>
                                ${escapeHTML(b.name)}
                            </strong>

                            <code>
                                ${escapeHTML(b.code)}
                            </code>

                        </div>

                        <p>

                            ⚽
                            ${escapeHTML(b.pitchName)}

                            <br>

                            📅
                            ${escapeHTML(b.date)}

                            <br>

                            🕐
                            ${formatTime(b.startTime)}
                            →
                            ${formatTime(b.endTime)}

                            <br>

                            ⏱️
                            ${escapeHTML(b.duration)} ساعة

                            <br>

                            💰
                            ${money(b.price)}

                            <br>

                            📱
                            ${escapeHTML(b.phone)}

                            <br>

                            💳 حوّل من:
                            ${escapeHTML(b.transferFrom)}

                            <br>

                            الحالة:
                            ${status}

                        </p>

                        <div class="admin-actions">

                            ${
                                b.proofUrl
                                ?
                                `
                                <button
                                    class="proof-btn"
                                    onclick="viewProof('${encodeURIComponent(b.proofUrl)}')">

                                    مشاهدة إثبات الدفع 📸

                                </button>
                                `
                                :
                                ""
                            }

                            ${
                                b.status === "pending"
                                ?
                                `

                                <button
                                    class="confirm-btn"
                                    onclick="changeBookingStatus('${encodeURIComponent(b.code)}','confirmed')">

                                    تأكيد الحجز ✓

                                </button>

                                <button
                                    class="cancel-btn"
                                    onclick="changeBookingStatus('${encodeURIComponent(b.code)}','cancelled')">

                                    إلغاء الحجز ✕

                                </button>

                                `
                                :
                                ""
                            }

                        </div>

                    </div>
                `;

            }).join("");

    } catch (error) {

        console.error(
            "Admin bookings error:",
            error
        );

        if ($("adminBookingsList")) {

            $("adminBookingsList").innerHTML = `
                <div class="admin-booking">
                    ❌ فشل تحميل الحجوزات.
                </div>
            `;
        }
    }
}


/* =========================================================
   CHANGE STATUS
========================================================= */

async function changeBookingStatus(
    code,
    status
) {

    const decodedCode =
        decodeURIComponent(code);

    const text =
        status === "confirmed"
            ? "تأكيد الحجز؟"
            : "إلغاء الحجز؟";

    if (!confirm(text))
        return;

    try {

        await apiRequest(
            `/bookings/${encodeURIComponent(decodedCode)}/status`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        status
                    })
            }
        );

        await renderAdminBookings();

        alert(
            status === "confirmed"
                ? "تم تأكيد الحجز ✓"
                : "تم إلغاء الحجز، والموعد أصبح متاحًا مرة أخرى ✓"
        );

    } catch (error) {

        console.error(
            "Change status error:",
            error
        );

        alert(
            error.message ||
            "حدث خطأ أثناء تغيير حالة الحجز."
        );
    }
}


/* =========================================================
   PAYMENT PROOF
========================================================= */

function viewProof(encodedUrl) {

    const proofUrl =
        decodeURIComponent(encodedUrl);

    const win =
        window.open(
            "",
            "_blank"
        );

    if (!win) {

        alert(
            "اسمح بفتح النوافذ المنبثقة."
        );

        return;
    }

    win.document.write(`

        <!DOCTYPE html>

        <html lang="ar" dir="rtl">

        <head>

            <meta charset="UTF-8">

            <title>
                إثبات الدفع - AL JAZEERA
            </title>

            <style>

                body {
                    margin:0;
                    min-height:100vh;
                    background:#050706;
                    color:white;
                    font-family:Arial,sans-serif;
                    text-align:center;
                    padding:30px;
                }

                h2 {
                    color:#19e66b;
                }

                img {
                    max-width:95%;
                    max-height:80vh;
                    border-radius:15px;
                    border:1px solid rgba(25,230,107,.2);
                }

            </style>

        </head>

        <body>

            <h2>
                إثبات الدفع
            </h2>

            <img
                src="${escapeHTML(proofUrl)}"
                alt="إثبات الدفع">

        </body>

        </html>
    `);

    win.document.close();
}


/* =========================================================
   MODAL OUTSIDE CLICK
========================================================= */

document
    .querySelectorAll(".modal")
    .forEach(modal => {

        modal.addEventListener(
            "click",
            function(e) {

                if (
                    e.target === modal
                ) {

                    modal
                        .classList
                        .remove("active");
                }
            }
        );
    });


/* =========================================================
   ADMIN ENTER
========================================================= */

const adminPassword =
    $("adminPassword");

if (adminPassword) {

    adminPassword.addEventListener(
        "keydown",
        function(e) {

            if (
                e.key === "Enter"
            ) {

                adminLogin();
            }
        }
    );
}


/* =========================================================
   UPDATE TIME LIVE
========================================================= */

[
    "bookingDate",
    "manualStartTime",
    "manualEndTime"
].forEach(id => {

    const element =
        $(id);

    if (!element)
        return;

    element.addEventListener(
        "change",
        checkMatchTime
    );
});


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

window.openBooking = openBooking;
window.closeBooking = closeBooking;

window.checkMatchTime = checkMatchTime;
window.selectAvailableTime = selectAvailableTime;

window.trackBooking = trackBooking;

window.copyVodafone = copyVodafone;

window.closePayment = closePayment;
window.closeSuccess = closeSuccess;

window.openAdmin = openAdmin;
window.closeAdmin = closeAdmin;

window.adminLogin = adminLogin;
window.saveAdminSettings = saveAdminSettings;

window.changeBookingStatus =
    changeBookingStatus;

window.viewProof = viewProof;


/* =========================================================
   INIT
========================================================= */

(async function init() {

    console.log(
        "AL JAZEERA Booking System Loaded ⚽🔥"
    );

    setupDateField();

    const connected =
        await checkServerConnection();

    if (!connected) {

        console.warn(
            "⚠️ Backend is not reachable."
        );

    }

    await loadSettings();

})();