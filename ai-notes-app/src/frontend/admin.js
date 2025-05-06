const userTableBody = document.getElementById('user-table-body');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const pageInfo = document.getElementById('page-info');
const errorMessageDiv = document.getElementById('error-message');

let currentPage = 1;
const limit = 10; // Or get from a UI element if you add one

/**
 * Fetches users from the backend API.
 * @param {number} page - The page number to fetch.
 * @param {number} limit - The number of users per page.
 */
async function fetchUsers(page = 1, limit = 10) {
    errorMessageDiv.textContent = ''; // Clear previous errors
    try {
        // **Crucially: Include the simulated user role header**
        const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': 'admin' // Simulate admin role
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayUsers(data);

    } catch (error) {
        console.error('Error fetching users:', error);
        errorMessageDiv.textContent = `Error: ${error.message}. Make sure the backend is running and you have 'admin' privileges (simulated via header).`;
        // Optionally disable pagination buttons on error
        prevButton.disabled = true;
        nextButton.disabled = true;
    }
}

/**
 * Displays users in the table and updates pagination controls.
 * @param {object} data - The data object from the API response.
 * @param {Array} data.users - Array of user objects.
 * @param {number} data.currentPage - The current page number.
 * @param {number} data.totalPages - The total number of pages.
 * @param {number} data.totalUsers - The total number of users.
 */
function displayUsers(data) {
    // Clear existing table rows
    userTableBody.innerHTML = '';

    if (!data.users || data.users.length === 0) {
        const row = userTableBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3; // Span across all columns
        cell.textContent = 'No users found.';
        cell.style.textAlign = 'center';
    } else {
        data.users.forEach(user => {
            const row = userTableBody.insertRow();
            row.insertCell().textContent = user.id;
            row.insertCell().textContent = user.username;
            row.insertCell().textContent = user.role;
        });
    }

    // Update pagination info
    currentPage = data.currentPage;
    pageInfo.textContent = `Page ${data.currentPage} of ${data.totalPages || 1}`;

    // Update pagination buttons state
    prevButton.disabled = data.currentPage <= 1;
    nextButton.disabled = data.currentPage >= data.totalPages;
}

// --- Event Listeners ---
prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
        fetchUsers(currentPage - 1, limit);
    }
});

nextButton.addEventListener('click', () => {
    // We rely on the displayUsers function to disable the button if it's the last page
    fetchUsers(currentPage + 1, limit);
});

// --- Initial Load ---
// Fetch the first page of users when the script loads
fetchUsers(currentPage, limit);