import { addDonation } from './firebase-service.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Donation script loaded');

    // Fetch Configuration (Razorpay Key)
    let razorpayKey = '';
    try {
        const response = await fetch('/api/config');
        if (!response.ok) throw new Error('Network response was not ok');
        const config = await response.json();
        razorpayKey = config.razorpayKeyId;
        console.log('Razorpay Key loaded:', razorpayKey ? 'Yes' : 'No');
    } catch (error) {
        console.error('Failed to load configuration:', error);
    }

    const donateForm = document.getElementById('support-form');
    const amountInput = document.getElementById('Enter-Amount');

    // Fix for Webflow custom checkbox (since w-form class was removed)
    const checkboxLabel = document.querySelector('.w-checkbox.form-checkbox-field');
    if (checkboxLabel) {
        const checkboxInput = checkboxLabel.querySelector('input[type="checkbox"]');
        const checkboxDiv = checkboxLabel.querySelector('.w-checkbox-input');

        if (checkboxInput && checkboxDiv) {
            checkboxLabel.addEventListener('click', (e) => {
                // Toggle the checkbox
                checkboxInput.checked = !checkboxInput.checked;

                // Update visual state
                if (checkboxInput.checked) {
                    checkboxDiv.classList.add('w--redirected-checked');
                } else {
                    checkboxDiv.classList.remove('w--redirected-checked');
                }

                console.log('Checkbox toggled:', checkboxInput.checked);
            });
        }
    }

    // Function to handle the donation process
    const handleDonation = async (e) => {
        if (e) e.preventDefault();
        console.log('Donation process initiated');

        const amount = amountInput.value.replace(/[^0-9.]/g, '');
        if (!amount || isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        if (!razorpayKey) {
            alert('Payment system is initializing. Please try again in a moment.');
            // Try fetching again in case it failed previously
            try {
                const response = await fetch('/api/config');
                const config = await response.json();
                razorpayKey = config.razorpayKeyId;
            } catch (err) { }
            return;
        }

        try {
            const firstName = document.getElementById('First-Name').value;
            const lastName = document.getElementById('Last-Name').value;
            const email = document.getElementById('Your-Email').value;
            const donationType = document.getElementById('food-type').value;
            const paymentMethodSelect = document.getElementById('Payment-Method');
            const paymentMethodText = paymentMethodSelect.options[paymentMethodSelect.selectedIndex].text;
            const message = document.getElementById('Type-Your-Message').value;

            const donationData = {
                amount: parseFloat(amount),
                currency: 'INR',
                donorName: `${firstName} ${lastName}`.trim() || 'Anonymous',
                donorEmail: email,
                donationType: donationType,
                paymentMethod: paymentMethodText,
                message: message
            };

            console.log('Donation data prepared:', donationData);

            const options = {
                key: razorpayKey,
                amount: Math.round(parseFloat(amount) * 100), // Amount in paise
                currency: "INR",
                name: "Karunya Charitable Trust",
                description: "Donation",
                image: "/images/chkarunyatrustlogo.png",
                modal: {
                    ondismiss: function () {
                        console.log('Razorpay modal dismissed');
                    },
                    escape: true,
                    backdropclose: false
                },
                handler: async function (response) {
                    console.log("Payment Success. ID: ", response.razorpay_payment_id);

                    const submitBtns = document.querySelectorAll('input[type="submit"], .secondary-button');
                    submitBtns.forEach(btn => {
                        if (btn.value) btn.value = "Saving...";
                        btn.disabled = true;
                    });

                    // Clear the form immediately after payment success
                    if (donateForm) {
                        donateForm.reset();
                        // Also uncheck the checkbox visually
                        const checkboxDiv = document.querySelector('.w-checkbox-input');
                        if (checkboxDiv) {
                            checkboxDiv.classList.remove('w--redirected-checked');
                        }
                    }

                    // Try to save to Firebase, but don't block success message if it fails
                    try {
                        await addDonation({
                            ...donationData,
                            paymentId: response.razorpay_payment_id,
                            status: 'success'
                        });
                        console.log('Donation saved to Firebase successfully');
                    } catch (err) {
                        console.error("Error saving donation to Firebase:", err);
                        // Don't show error to user since payment was successful
                    }

                    // Show success message
                    const successDiv = document.querySelector('.w-form-done');
                    const formDiv = donateForm;

                    if (successDiv) {
                        if (formDiv) formDiv.style.display = 'none';
                        successDiv.style.display = 'block';
                        successDiv.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        alert('Thank you for your donation! Your payment ID is: ' + response.razorpay_payment_id);
                    }

                    // Re-enable submit buttons after a delay
                    setTimeout(() => {
                        submitBtns.forEach(btn => {
                            if (btn.value) btn.value = "Donate Now";
                            btn.disabled = false;
                        });
                    }, 2000);
                },
                prefill: {
                    name: donationData.donorName,
                    email: donationData.donorEmail,
                },
                notes: {
                    message: donationData.message
                },
                theme: {
                    color: "#351C42"
                }
            };

            console.log('Opening Razorpay popup...');
            const rzp1 = new Razorpay(options);
            rzp1.on('payment.failed', function (response) {
                console.error('Payment failed:', response.error);
                alert('Payment Failed: ' + response.error.description);
            });
            rzp1.open();
        } catch (err) {
            console.error('Error during payment initialization:', err);
            alert('An error occurred. Please check the console for details.');
        }
    };

    // Attach to form submit
    if (donateForm) {
        console.log('Attaching to form submit');
        donateForm.addEventListener('submit', handleDonation);
    }

    // Attach to anything that looks like the "Donate Now" button to prevent page reload
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a, button, input[type="submit"]');
        if (target && target.textContent.trim() === 'Donate Now') {
            console.log('Donate Now button clicked (delegation)');

            // If it's the submit button, let the form submit event handle it
            if (target.type === 'submit' || (target.tagName === 'INPUT' && target.getAttribute('type') === 'submit')) {
                return;
            }

            // Otherwise, manually trigger the donation process
            handleDonation(e);
        }
    });

    if (!donateForm) {
        console.error('Donation form (#support-form) not found');
    }
});
