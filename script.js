// ======================================
// BET Learner Management System
// ======================================

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyO89H4tRqU7PmRqUr9nsgQIKWpG4joY6JR-hDvfMf080IuG1pV7sr43yXOIjYq103L/exec";

const form = document.getElementById("registrationForm");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
const submitBtnText = document.getElementById("submitBtnText");

const tabButtons = document.querySelectorAll(".tab-btn");
const lookupBar = document.getElementById("lookupBar");
const lookupBtn = document.getElementById("lookupBtn");
const lookupID = document.getElementById("lookupID");
const lookupResult = document.getElementById("lookupResult");
const reasonGroup = document.getElementById("reasonGroup");

let currentMode = "register";     // register | renew | remove
let currentLearnerID = null;      // set after a successful lookup

// ======================================
// MODE SWITCHING
// ======================================

tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        tabButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentMode = btn.dataset.mode;
        switchMode(currentMode);
    });
});

function switchMode(mode) {
    message.innerHTML = "";
    lookupResult.innerHTML = "";
    lookupID.value = "";
    currentLearnerID = null;
    form.reset();
    form.style.display = "none";
    reasonGroup.style.display = "none";

    if (mode === "register") {
        lookupBar.style.display = "none";
        form.style.display = "block";
        setFormEnabled(true);
        submitBtnText.textContent = "Register Learner";
    }

    if (mode === "renew") {
        lookupBar.style.display = "flex";
        submitBtnText.textContent = "Save Renewal";
    }

    if (mode === "remove") {
        lookupBar.style.display = "flex";
        submitBtnText.textContent = "Remove Learner";
    }
}

// ======================================
// LOOKUP (Renew & Remove)
// ======================================

lookupBtn.addEventListener("click", function () {
    const id = lookupID.value.trim();
    if (!id) {
        lookupResult.innerHTML = `<p class="error">Enter a Learner ID first.</p>`;
        return;
    }

    lookupBtn.disabled = true;
    lookupBtn.innerHTML = "Searching...";

    fetch(`${SCRIPT_URL}?action=lookup&learnerID=${encodeURIComponent(id)}`)
        .then(res => res.json())
        .then(result => {
            if (!result.success) throw new Error(result.message);

            currentLearnerID = id;
            fillFormFromLearner(result.learner);
            form.style.display = "block";

            if (currentMode === "renew") {
                setFormEnabled(true);
                lookupResult.innerHTML = `<p class="success">Found: ${result.learner["Learner Name"]}. Update the fields below and save.</p>`;
            }

            if (currentMode === "remove") {
                setFormEnabled(false);
                reasonGroup.style.display = "block";
                lookupResult.innerHTML = `<p class="success">Found: ${result.learner["Learner Name"]}. Confirm the reason and remove.</p>`;
            }
        })
        .catch(err => {
            form.style.display = "none";
            currentLearnerID = null;
            lookupResult.innerHTML = `<p class="error">❌ ${err.message}</p>`;
        })
        .finally(() => {
            lookupBtn.disabled = false;
            lookupBtn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> Find Learner`;
        });
});

function fillFormFromLearner(learner) {
    setSelectOrInput("assistantName", learner["Assistant Name"]);
    setSelectOrInput("learnerName", learner["Learner Name"]);
    setSelectOrInput("contact", learner["Learner Contact"]);
    setSelectOrInput("email", learner["Learner Email"]);
    setSelectOrInput("level", learner["Learner Level"]);
    setDateField("startDate", learner["Start Date"]);
    setDateField("endDate", learner["End Date"]);
    setDateField("renewalDate", learner["Learner Renewal Date"]);
    setSelectOrInput("months", learner["Number of Months"]);
    setSelectOrInput("coach", learner["Coach Name"]);
    setSelectOrInput("contractID", learner["Contract ID"]);
    setSelectOrInput("contractType", learner["Contract Type"]);
    setSelectOrInput("center", learner["Center"]);
    setSelectOrInput("days", learner["Days"]);
    setSelectOrInput("time", learner["Time"]);
    setSelectOrInput("status", learner["Status"]);
    setSelectOrInput("certificateIssued", learner["Certificate Issued"] || "No");
    setDateField("certificateDate", learner["Certificate Date"]);
}

function setSelectOrInput(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
}

// Google Sheets returns dates as ISO strings/Date objects; normalise to yyyy-MM-dd for <input type="date">
function setDateField(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!value) { el.value = ""; return; }
    const d = new Date(value);
    el.value = isNaN(d) ? "" : d.toISOString().split("T")[0];
}

function setFormEnabled(enabled) {
    form.querySelectorAll("input, select").forEach(el => {
        if (el.id === "reason") return; // always editable
        el.disabled = !enabled;
    });
}

// ======================================
// SUBMIT (Register / Renew / Remove)
// ======================================

form.addEventListener("submit", function (e) {
    e.preventDefault();

    if ((currentMode === "renew" || currentMode === "remove") && !currentLearnerID) {
        message.style.color = "red";
        message.innerHTML = "❌ Find a learner first.";
        return;
    }

    submitBtn.disabled = true;
    submitBtnText.textContent = "Saving...";

    const data = {
        action: currentMode,
        learnerID: currentLearnerID,

        assistantID: document.getElementById("assistantID")?.value || "",
        assistantName: document.getElementById("assistantName").value,
        learnerName: document.getElementById("learnerName").value,
        contact: document.getElementById("contact").value,
        email: document.getElementById("email").value,
        level: document.getElementById("level").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        renewalDate: document.getElementById("renewalDate").value,
        months: document.getElementById("months").value,
        coachID: document.getElementById("coachID")?.value || "",
        coach: document.getElementById("coach").value,
        contractID: document.getElementById("contractID").value,
        contractType: document.getElementById("contractType").value,
        center: document.getElementById("center").value,
        days: document.getElementById("days").value,
        time: document.getElementById("time").value,
        status: document.getElementById("status")?.value || "Active",
        certificateIssued: document.getElementById("certificateIssued")?.value || "No",
        certificateDate: document.getElementById("certificateDate").value,
        reason: document.getElementById("reason")?.value || ""
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.result !== "success") throw new Error(result.message);

            message.style.color = "green";
            if (currentMode === "register") {
                message.innerHTML = "✅ Learner Registered Successfully Welcome to BET 🥰🥰🥰!";
            } else if (currentMode === "renew") {
                message.innerHTML = `✅ ${result.learnerID} renewed successfully.`;
            } else if (currentMode === "remove") {
                message.innerHTML = `✅ ${result.learnerID} removed and archived successfully.`;
            }

            form.reset();
            form.style.display = "none";
            lookupResult.innerHTML = "";
            currentLearnerID = null;
        })
        .catch(error => {
            console.error(error);
            message.style.color = "red";
            message.innerHTML = "❌ " + error.message;
        })
        .finally(() => {
            submitBtn.disabled = false;
            const labels = { register: "Register Learner", renew: "Save Renewal", remove: "Remove Learner" };
            submitBtnText.textContent = labels[currentMode] || "Submit";
        });
});

// ======================================
// INIT
// ======================================
switchMode("register");
