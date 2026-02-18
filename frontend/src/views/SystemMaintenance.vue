<template>
  <div class="maintenance-container">
    <!-- DRAG BAR -->
    <div class="drag-bar">
      <span class="window-title">FleetGate - System Maintenance</span>
    </div>

    <!-- CLOSE BUTTON -->
    <button class="close-btn" @click="goBack" title="Close">✕</button>

    <!-- ACCESS DENIED -->
    <div v-if="!isDevAdmin" class="access-denied">
      <div class="denied-content">
        <div class="denied-icon">🔒</div>
        <h2>Access Denied</h2>
        <p>You do not have permission to access System Maintenance.</p>
        <p>Only DEV can access this section.</p>
        <button @click="goBack" class="btn-back">Go Back</button>
      </div>
    </div>

    <!-- LOADING -->
    <div v-else-if="isLoading" class="loading-screen">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <!-- MAINTENANCE PANEL -->
    <div v-else class="maintenance-panel">
      <div class="tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </div>

      <div class="tab-content">
        <!-- SYSTEM CONFIGURATION -->
        <div v-show="activeTab === 'config'" class="tab-panel">
          <h3>System Configuration</h3>
          <div class="config-form">
            <div class="form-group">
              <label>System Name</label>
              <input v-model="config.systemName" type="text" placeholder="Enter system name" />
            </div>
            <div class="form-group">
              <label>API URL</label>
              <input v-model="config.apiUrl" type="text" placeholder="Enter API URL" />
            </div>
            <div class="form-group">
              <label>Database Host</label>
              <input v-model="config.dbHost" type="text" placeholder="Enter database host" />
            </div>
            <div class="form-group">
              <label>Enable Debug Mode</label>
              <input v-model="config.debugMode" type="checkbox" />
            </div>
            <button class="btn-save" @click="saveConfig">Save Configuration</button>
          </div>
        </div>

        <!-- TENANTS MANAGEMENT -->
        <div v-show="activeTab === 'tenants'" class="tab-panel">
          <h3>Tenants Management</h3>
          <div class="tenants-section">
            <div class="tenants-actions">
              <button class="btn-add-user" @click="openAddTenantForm">+ Create Tenant</button>
              <button class="btn-action btn-refresh" @click="loadTenants">↻ Refresh</button>
            </div>

            <div class="filters-bar">
              <input v-model="tenantNameFilter" class="filter-input" type="text" placeholder="Filter by tenant name" />
              <input v-model="tenantCodeFilter" class="filter-input" type="text" placeholder="Filter by tenant code" />
              <select v-model="tenantDbModeFilter" class="filter-select">
                <option value="">All DB Modes</option>
                <option value="SHARED">SHARED</option>
                <option value="DEDICATED">DEDICATED</option>
              </select>
              <select v-model="tenantStatusFilter" class="filter-select">
                <option value="">All Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <button class="btn-cancel" @click="clearTenantFilters">Clear</button>
            </div>

            <div v-if="showAddTenantForm" class="modal-overlay" @click="closeAddTenantForm">
              <div class="modal-card modal-compact" @click.stop>
                <h4>Create Tenant</h4>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>Code</label>
                    <input v-model="newTenant.code" type="text" placeholder="e.g. ACME" />
                  </div>
                  <div class="form-group">
                    <label>Name</label>
                    <input v-model="newTenant.name" type="text" placeholder="Tenant name" />
                  </div>
                  <div class="form-group">
                    <label>DB Mode</label>
                    <select v-model="newTenant.dbMode">
                      <option value="SHARED">SHARED</option>
                      <option value="DEDICATED">DEDICATED</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Status</label>
                    <select v-model="newTenant.isActive">
                      <option :value="true">ACTIVE</option>
                      <option :value="false">INACTIVE</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>DB Name</label>
                    <input v-model="newTenant.dbName" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB Host</label>
                    <input v-model="newTenant.dbHost" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB Port</label>
                    <input v-model="newTenant.dbPort" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB User</label>
                    <input v-model="newTenant.dbUser" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB Password</label>
                    <input v-model="newTenant.dbPassword" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB URL</label>
                    <input v-model="newTenant.dbUrl" type="text" placeholder="Optional" />
                  </div>
                </div>
                <div class="form-group">
                  <label>Notes</label>
                  <input v-model="newTenant.notes" type="text" placeholder="Optional notes" />
                </div>
                <div class="form-actions">
                  <button class="btn-submit" @click="addTenant">Create Tenant</button>
                  <button class="btn-cancel" @click="closeAddTenantForm">Cancel</button>
                </div>
              </div>
            </div>

            <div v-if="showEditTenantForm" class="modal-overlay" @click="cancelTenantEdit">
              <div class="modal-card modal-compact" @click.stop>
                <h4>Edit Tenant</h4>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>Code</label>
                    <input v-model="editTenantForm.code" type="text" placeholder="e.g. ACME" />
                  </div>
                  <div class="form-group">
                    <label>Name</label>
                    <input v-model="editTenantForm.name" type="text" placeholder="Tenant name" />
                  </div>
                  <div class="form-group">
                    <label>DB Mode</label>
                    <select v-model="editTenantForm.dbMode">
                      <option value="SHARED">SHARED</option>
                      <option value="DEDICATED">DEDICATED</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>Status</label>
                    <select v-model="editTenantForm.isActive">
                      <option :value="true">ACTIVE</option>
                      <option :value="false">INACTIVE</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>DB Name</label>
                    <input v-model="editTenantForm.dbName" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB Host</label>
                    <input v-model="editTenantForm.dbHost" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB Port</label>
                    <input v-model="editTenantForm.dbPort" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB User</label>
                    <input v-model="editTenantForm.dbUser" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB Password</label>
                    <input v-model="editTenantForm.dbPassword" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>DB URL</label>
                    <input v-model="editTenantForm.dbUrl" type="text" placeholder="Optional" />
                  </div>
                </div>
                <div class="form-group">
                  <label>Notes</label>
                  <input v-model="editTenantForm.notes" type="text" placeholder="Optional notes" />
                </div>
                <div class="form-actions">
                  <button class="btn-submit" @click="saveTenantEdit">Save Changes</button>
                  <button class="btn-cancel" @click="cancelTenantEdit">Cancel</button>
                </div>
              </div>
            </div>

            <div class="tenants-table" v-if="filteredTenants.length > 0">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Code</th>
                    <th>Name</th>
                    <th>DB Mode</th>
                    <th>Status</th>
                    <th>DB Host/Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="tenant in filteredTenants" :key="tenant.id">
                    <td>#{{ tenant.id }}</td>
                    <td>{{ tenant.code }}</td>
                    <td>{{ tenant.name }}</td>
                    <td>{{ tenant.dbMode }}</td>
                    <td><span :class="['status-badge', tenant.isActive ? 'active' : 'inactive']">{{ tenant.isActive ? 'ACTIVE' : 'INACTIVE' }}</span></td>
                    <td class="mono-value">{{ tenant.dbHost || '-' }} / {{ tenant.dbName || '-' }}</td>
                    <td class="actions-cell">
                      <div class="action-buttons">
                        <button class="btn-edit" @click="editTenant(tenant)">Edit</button>
                        <button class="btn-status" @click="toggleTenantStatus(tenant)">Status</button>
                        <button class="btn-delete" @click="deleteTenant(tenant)">Delete</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="empty-message">No tenants found</div>
          </div>
        </div>

        <!-- USER MANAGEMENT -->
        <div v-show="activeTab === 'users'" class="tab-panel">
          <h3>User Management</h3>
          <div class="users-section">
            <div class="users-actions">
              <button class="btn-add-user" @click="openAddUserForm">+ Create User</button>
              <button class="btn-action btn-refresh" @click="loadUsers">↻ Refresh</button>
            </div>

            <div class="filters-bar">
              <input v-model="userNameFilter" class="filter-input" type="text" placeholder="Filter by name" />
              <input v-model="userEmailFilter" class="filter-input" type="text" placeholder="Filter by email" />
              <select v-model="userRoleFilter" class="filter-select">
                <option value="">All Roles</option>
                <option value="CLIENT">Client</option>
                <option value="FLEET">Fleet</option>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
                <option value="DEV">DEV</option>
                <option value="IT">IT</option>
              </select>
              <select v-model="userStatusFilter" class="filter-select">
                <option value="">All Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="PENDING">PENDING</option>
              </select>
              <select v-model="userLastLoginFilter" class="filter-select">
                <option value="">All Last Login</option>
                <option value="NEVER">Never</option>
                <option value="TODAY">Today</option>
                <option value="LAST_7_DAYS">Last 7 days</option>
                <option value="LAST_30_DAYS">Last 30 days</option>
              </select>
              <select v-model="userStationFilter" class="filter-select">
                <option value="">All Stations</option>
                <option value="__none__">No Station</option>
                <option v-for="station in stations" :key="station.id" :value="station.id">
                  {{ station.name }} (#{{ station.id }})
                </option>
              </select>
              <input v-model="userTenantIdFilter" class="filter-input" type="text" placeholder="Filter by tenant ID" />
              <input v-model="userTenantCodeFilter" class="filter-input" type="text" placeholder="Filter by tenant code" />
              <button class="btn-cancel" @click="clearUserFilters">Clear</button>
            </div>

            <div v-if="showAddUserForm" class="modal-overlay" @click="closeAddUserForm">
              <div class="modal-card user-form-modal" @click.stop>
                <h4>Create User</h4>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>Username</label>
                    <input v-model="newUser.username" type="text" placeholder="Enter username" />
                  </div>
                  <div class="form-group">
                    <label>Password</label>
                    <div class="password-field">
                      <input
                        v-model="newUser.password"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="Minimum 8 characters"
                      />
                      <button type="button" class="btn-toggle-password" @click="showPassword = !showPassword">
                        {{ showPassword ? 'Hide' : 'Show' }}
                      </button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Confirm Password</label>
                    <div class="password-field">
                      <input
                        v-model="newUser.confirmPassword"
                        :type="showConfirmPassword ? 'text' : 'password'"
                        placeholder="Repeat password"
                      />
                      <button type="button" class="btn-toggle-password" @click="showConfirmPassword = !showConfirmPassword">
                        {{ showConfirmPassword ? 'Hide' : 'Show' }}
                      </button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Role</label>
                    <select v-model="newUser.role">
                      <option value="CLIENT">Client</option>
                      <option value="FLEET">Fleet</option>
                      <option value="STAFF">Staff</option>
                      <option value="DEV">DEV</option>
                      <option value="IT">IT</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>

                <div class="section-title">Base Information</div>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>First Name</label>
                    <input v-model="newUser.firstName" type="text" placeholder="Enter first name" />
                  </div>
                  <div class="form-group">
                    <label>Last Name</label>
                    <input v-model="newUser.lastName" type="text" placeholder="Enter last name" />
                  </div>
                  <div class="form-group">
                    <label>Phone</label>
                    <div class="phone-field">
                      <span class="phone-plus">+</span>
                      <input
                        v-model="newUser.phoneCountryCode"
                        class="phone-code-input"
                        type="text"
                        placeholder="351"
                      />
                      <input
                        v-model="newUser.phone"
                        class="phone-number-input"
                        type="text"
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Alternative Phone</label>
                    <input v-model="newUser.alternativePhone" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>Email</label>
                    <input v-model="newUser.email" type="email" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>Date of Birth</label>
                    <input v-model="newUser.dateOfBirth" type="date" />
                  </div>
                </div>

                <div class="section-title">Address</div>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>Address</label>
                    <input v-model="newUser.address" type="text" placeholder="Street and number" />
                  </div>
                  <div class="form-group">
                    <label>City</label>
                    <input v-model="newUser.city" type="text" placeholder="City" />
                  </div>
                  <div class="form-group">
                    <label>Postal Code</label>
                    <input v-model="newUser.postalCode" type="text" placeholder="Postal code" />
                  </div>
                  <div class="form-group">
                    <label>Country</label>
                    <input
                      v-model="newUser.country"
                      list="country-options"
                      type="text"
                      placeholder="Type to filter country"
                    />
                  </div>
                </div>

                <div class="section-title">Client Dossier</div>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>NIF</label>
                    <input v-model="newUser.nif" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>Nationality</label>
                    <div class="autocomplete-wrapper">
                      <input
                        v-model="newUser.nationality"
                        type="text"
                        placeholder="Type to filter nationality"
                        @focus="showNationalityDropdown = true"
                        @input="showNationalityDropdown = true"
                        @blur="closeNationalityDropdown"
                      />
                      <div v-if="showNationalityDropdown" class="autocomplete-list">
                        <button
                          v-for="nationality in filteredNationalities"
                          :key="nationality"
                          type="button"
                          class="autocomplete-item"
                          @mousedown.prevent="selectNationality(nationality)"
                        >
                          {{ nationality }}
                        </button>
                        <div v-if="filteredNationalities.length === 0" class="autocomplete-empty">No nationality found</div>
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Driving License Number</label>
                    <input v-model="newUser.licenseNumber" type="text" placeholder="License number" />
                  </div>
                  <div class="form-group">
                    <label>License Country</label>
                    <input
                      v-model="newUser.licenseCountry"
                      list="country-options"
                      type="text"
                      placeholder="Type to filter country"
                    />
                  </div>
                  <div class="form-group">
                    <label>License Issue Date</label>
                    <input v-model="newUser.licenseIssueDate" type="date" />
                  </div>
                  <div class="form-group">
                    <label>License Expiry</label>
                    <input v-model="newUser.licenseExpiry" type="date" />
                  </div>
                  <div class="form-group">
                    <label>Identification Document</label>
                    <select v-model="newUser.idDocumentType">
                      <option value="CC">Citizen Card (CC)</option>
                      <option value="PASSPORT">Passport</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>{{ newUser.idDocumentType === 'PASSPORT' ? 'Passport Number' : 'CC Number' }}</label>
                    <input
                      v-model="newUser.idCardNumber"
                      type="text"
                      :placeholder="newUser.idDocumentType === 'PASSPORT' ? 'Passport number' : 'Citizen card number'"
                    />
                  </div>
                  <div class="form-group">
                    <label>{{ newUser.idDocumentType === 'PASSPORT' ? 'Passport Expiry' : 'CC Expiry' }}</label>
                    <input v-model="newUser.idCardExpiry" type="date" />
                  </div>
                </div>

                <template v-if="newUser.role !== 'CLIENT'">
                  <div class="section-title">Staff Additional Information</div>
                  <div class="form-grid-two">
                    <div class="form-group">
                      <label>Employee Number</label>
                      <input type="text" value="Auto-generated by system" disabled />
                    </div>
                    <div class="form-group">
                      <label>Hire Date</label>
                      <input v-model="newUser.hireDate" type="date" />
                    </div>
                  </div>
                </template>

                <div class="form-group">
                  <label>Station (Optional)</label>
                  <select v-model="newUser.stationId">
                    <option value="">Select station</option>
                    <option v-for="station in stations" :key="station.id" :value="station.id">
                      {{ station.name }} (#{{ station.id }})
                    </option>
                  </select>
                </div>

                <div v-if="userFormError" class="form-error">{{ userFormError }}</div>
                <div v-if="userFormSuccess" class="form-success">{{ userFormSuccess }}</div>

                <div class="form-actions">
                  <button class="btn-submit" @click="addUser">Create User</button>
                  <button class="btn-cancel" @click="closeAddUserForm">Cancel</button>
                </div>

                <datalist id="country-options">
                  <option v-for="country in COUNTRY_OPTIONS" :key="country" :value="country" />
                </datalist>
              </div>
            </div>

            <div v-if="showEditUserForm" class="modal-overlay" @click="cancelUserEdit">
              <div class="modal-card user-form-modal" @click.stop>
                <h4>Edit User</h4>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>Username</label>
                    <input v-model="editUserForm.userCode" type="text" placeholder="Enter username" />
                  </div>
                  <div class="form-group">
                    <label>Role</label>
                    <select v-model="editUserForm.role">
                      <option value="CLIENT">Client</option>
                      <option value="FLEET">Fleet</option>
                      <option value="STAFF">Staff</option>
                      <option value="DEV">DEV</option>
                      <option value="IT">IT</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>

                <div class="section-title">Password (Optional)</div>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>New Password</label>
                    <div class="password-field">
                      <input
                        v-model="editUserForm.password"
                        :type="showEditPassword ? 'text' : 'password'"
                        placeholder="Leave blank to keep"
                      />
                      <button type="button" class="btn-toggle-password" @click="showEditPassword = !showEditPassword">
                        {{ showEditPassword ? 'Hide' : 'Show' }}
                      </button>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Confirm Password</label>
                    <div class="password-field">
                      <input
                        v-model="editUserForm.confirmPassword"
                        :type="showEditConfirmPassword ? 'text' : 'password'"
                        placeholder="Repeat password"
                      />
                      <button type="button" class="btn-toggle-password" @click="showEditConfirmPassword = !showEditConfirmPassword">
                        {{ showEditConfirmPassword ? 'Hide' : 'Show' }}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="section-title">Base Information</div>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>First Name</label>
                    <input v-model="editUserForm.firstName" type="text" placeholder="Enter first name" />
                  </div>
                  <div class="form-group">
                    <label>Last Name</label>
                    <input v-model="editUserForm.lastName" type="text" placeholder="Enter last name" />
                  </div>
                  <div class="form-group">
                    <label>Phone</label>
                    <div class="phone-field">
                      <span class="phone-plus">+</span>
                      <input
                        v-model="editUserForm.phoneCountryCode"
                        class="phone-code-input"
                        type="text"
                        placeholder="351"
                      />
                      <input
                        v-model="editUserForm.phone"
                        class="phone-number-input"
                        type="text"
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Alternative Phone</label>
                    <input v-model="editUserForm.alternativePhone" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>Email</label>
                    <input v-model="editUserForm.email" type="email" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>Date of Birth</label>
                    <input v-model="editUserForm.dateOfBirth" type="date" />
                  </div>
                </div>

                <div class="section-title">Identification</div>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>NIF</label>
                    <input v-model="editUserForm.nif" type="text" placeholder="Optional" />
                  </div>
                  <div class="form-group">
                    <label>Nationality</label>
                    <div class="autocomplete-wrapper">
                      <input
                        v-model="editUserForm.nationality"
                        type="text"
                        placeholder="Type to filter nationality"
                        @focus="showEditNationalityDropdown = true"
                        @input="showEditNationalityDropdown = true"
                        @blur="closeEditNationalityDropdown"
                      />
                      <div v-if="showEditNationalityDropdown" class="autocomplete-list">
                        <button
                          v-for="nationality in filteredEditNationalities"
                          :key="nationality"
                          type="button"
                          class="autocomplete-item"
                          @mousedown.prevent="selectEditNationality(nationality)"
                        >
                          {{ nationality }}
                        </button>
                        <div v-if="filteredEditNationalities.length === 0" class="autocomplete-empty">No nationality found</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="section-title">Address</div>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>Address</label>
                    <input v-model="editUserForm.address" type="text" placeholder="Street and number" />
                  </div>
                  <div class="form-group">
                    <label>City</label>
                    <input v-model="editUserForm.city" type="text" placeholder="City" />
                  </div>
                  <div class="form-group">
                    <label>Postal Code</label>
                    <input v-model="editUserForm.postalCode" type="text" placeholder="Postal code" />
                  </div>
                  <div class="form-group">
                    <label>Country</label>
                    <input
                      v-model="editUserForm.country"
                      list="country-options-edit"
                      type="text"
                      placeholder="Type to filter country"
                    />
                  </div>
                </div>

                <div class="section-title">Client Dossier</div>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>Driving License Number</label>
                    <input v-model="editUserForm.licenseNumber" type="text" placeholder="License number" />
                  </div>
                  <div class="form-group">
                    <label>License Country</label>
                    <input
                      v-model="editUserForm.licenseCountry"
                      list="country-options-edit"
                      type="text"
                      placeholder="Type to filter country"
                    />
                  </div>
                  <div class="form-group">
                    <label>License Issue Date</label>
                    <input v-model="editUserForm.licenseIssueDate" type="date" />
                  </div>
                  <div class="form-group">
                    <label>License Expiry</label>
                    <input v-model="editUserForm.licenseExpiry" type="date" />
                  </div>
                  <div class="form-group">
                    <label>Identification Document</label>
                    <select v-model="editUserForm.idDocumentType">
                      <option value="CC">Citizen Card (CC)</option>
                      <option value="PASSPORT">Passport</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>{{ editUserForm.idDocumentType === 'PASSPORT' ? 'Passport Number' : 'CC Number' }}</label>
                    <input
                      v-model="editUserForm.idCardNumber"
                      type="text"
                      :placeholder="editUserForm.idDocumentType === 'PASSPORT' ? 'Passport number' : 'Citizen card number'"
                    />
                  </div>
                  <div class="form-group">
                    <label>{{ editUserForm.idDocumentType === 'PASSPORT' ? 'Passport Expiry' : 'CC Expiry' }}</label>
                    <input v-model="editUserForm.idCardExpiry" type="date" />
                  </div>
                </div>

                <template v-if="editUserForm.role !== 'CLIENT'">
                  <div class="section-title">Staff Additional Information</div>
                  <div class="form-grid-two">
                    <div class="form-group">
                      <label>Employee Number</label>
                      <input v-model="editUserForm.employeeNumber" type="text" placeholder="Employee number" />
                    </div>
                    <div class="form-group">
                      <label>Hire Date</label>
                      <input v-model="editUserForm.hireDate" type="date" />
                    </div>
                  </div>
                </template>

                <div class="form-group">
                  <label>Station (Optional)</label>
                  <select v-model="editUserForm.stationId">
                    <option value="">Select station</option>
                    <option v-for="station in stations" :key="station.id" :value="station.id">
                      {{ station.name }} (#{{ station.id }})
                    </option>
                  </select>
                </div>

                <div v-if="editUserFormError" class="form-error">{{ editUserFormError }}</div>
                <div v-if="editUserFormSuccess" class="form-success">{{ editUserFormSuccess }}</div>

                <div class="form-actions">
                  <button class="btn-submit" @click="saveUserEdit">Save Changes</button>
                  <button class="btn-cancel" @click="cancelUserEdit">Cancel</button>
                </div>

                <datalist id="country-options-edit">
                  <option v-for="country in COUNTRY_OPTIONS" :key="country" :value="country" />
                </datalist>
              </div>
            </div>

            <div class="users-table" v-if="filteredStaffUsers.length > 0">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>
                      <button class="sort-header-btn" @click="toggleUserTenantSort('id')">
                        Tenant ID {{ userTenantSortBy === 'id' ? (userTenantSortDir === 'asc' ? '↑' : '↓') : '' }}
                      </button>
                    </th>
                    <th>
                      <button class="sort-header-btn" @click="toggleUserTenantSort('code')">
                        Tenant Code {{ userTenantSortBy === 'code' ? (userTenantSortDir === 'asc' ? '↑' : '↓') : '' }}
                      </button>
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in paginatedStaffUsers" :key="user.id">
                    <td>#{{ user.id }}</td>
                    <td>{{ user.userCode }}</td>
                    <td>{{ user.email }}</td>
                    <td><span :class="['role-badge', user.role?.toLowerCase()]">{{ user.role }}</span></td>
                    <td><span :class="['status-badge', user.status?.toLowerCase()]">{{ user.status }}</span></td>
                    <td>{{ user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never' }}</td>
                    <td>{{ user.tenantId ?? '-' }}</td>
                    <td>{{ user.tenantCode || '-' }}</td>
                    <td class="actions-cell">
                      <div class="action-buttons">
                        <button class="btn-edit" @click="editUser(user)">Edit</button>
                        <button
                          class="btn-status"
                          @click="changeStaffStatus(user)"
                          :disabled="isCurrentUser(user.id)"
                          :title="isCurrentUser(user.id) ? 'Cannot change your own account status' : ''"
                        >
                          Status
                        </button>
                        <button
                          class="btn-delete"
                          @click="deleteUser(user.id)"
                          :disabled="isCurrentUser(user.id)"
                          :title="isCurrentUser(user.id) ? 'Cannot delete your own account' : ''"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div v-if="staffTotalPages > 1" class="table-pagination">
                <button
                  class="page-btn page-nav"
                  :disabled="staffPage === 1"
                  @click="staffPage = 1"
                >
                  &lt;&lt;
                </button>
                <button
                  class="page-btn page-nav"
                  :disabled="staffPage === 1"
                  @click="staffPage = Math.max(1, staffPage - 1)"
                >
                  &lt;
                </button>

                <button
                  v-for="page in staffPageNumbers"
                  :key="page"
                  class="page-btn"
                  :class="{ active: page === staffPage }"
                  @click="staffPage = page"
                >
                  {{ page }}
                </button>

                <button
                  class="page-btn page-nav"
                  :disabled="staffPage === staffTotalPages"
                  @click="staffPage = Math.min(staffTotalPages, staffPage + 1)"
                >
                  &gt;
                </button>
                <button
                  class="page-btn page-nav"
                  :disabled="staffPage === staffTotalPages"
                  @click="staffPage = staffTotalPages"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
            <div v-else class="empty-message">{{ users.length === 0 ? 'No users found' : 'No staff match current filters' }}</div>
          </div>
        </div>

        <!-- STATION MANAGEMENT -->
        <div v-show="activeTab === 'stations'" class="tab-panel">
          <h3>Station Management</h3>
          <div class="stations-section">
            <div class="stations-actions">
              <button class="btn-add-station" @click="toggleAddStationForm">+ Create Station</button>
              <button class="btn-action btn-refresh" @click="loadStations">↻ Refresh</button>
            </div>

            <div class="filters-bar">
              <input v-model="stationNameFilter" class="filter-input" type="text" placeholder="Filter by station name" />
              <input v-model="stationEmailFilter" class="filter-input" type="text" placeholder="Filter by email" />
              <input v-model="stationPhoneFilter" class="filter-input" type="text" placeholder="Filter by mobile" />
              <input v-model="stationCityFilter" class="filter-input" type="text" placeholder="Filter by city" />
              <input v-model="stationTenantIdFilter" class="filter-input" type="text" placeholder="Filter by tenant ID" />
              <input v-model="stationTenantCodeFilter" class="filter-input" type="text" placeholder="Filter by tenant code" />
              <select v-model="stationStatusFilter" class="filter-select">
                <option value="">All Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <button class="btn-cancel" @click="clearStationFilters">Clear</button>
            </div>

            <div v-if="showAddStationForm" class="modal-overlay" @click="closeAddStationForm">
              <div class="modal-card modal-compact" @click.stop>
                <h4>Create Station</h4>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>Station Name</label>
                    <input v-model="newStation.name" type="text" placeholder="Enter station name" />
                  </div>
                  <div class="form-group">
                    <label>Location</label>
                    <input v-model="newStation.city" type="text" placeholder="Enter city (optional)" />
                  </div>
                  <div class="form-group">
                    <label>Email</label>
                    <input v-model="newStation.email" type="email" placeholder="Enter station email (optional)" />
                  </div>
                  <div class="form-group">
                    <label>Phone</label>
                    <input v-model="newStation.phone" type="text" placeholder="Enter station phone (optional)" />
                  </div>
                  <div class="form-group">
                    <label>Address</label>
                    <input v-model="newStation.address" type="text" placeholder="Enter station address (optional)" />
                  </div>
                  <div class="form-group">
                    <label>Postal Code</label>
                    <input v-model="newStation.postalCode" type="text" placeholder="Enter postal code (optional)" />
                  </div>
                </div>
                <div v-if="stationFormError" class="form-error">{{ stationFormError }}</div>
                <div v-if="stationFormSuccess" class="form-success">{{ stationFormSuccess }}</div>
                <div class="form-actions">
                  <button class="btn-submit" @click="addStation">Create Station</button>
                  <button class="btn-cancel" @click="closeAddStationForm">Cancel</button>
                </div>
              </div>
            </div>

            <div v-if="showEditStationForm" class="modal-overlay" @click="cancelStationEdit">
              <div class="modal-card modal-compact" @click.stop>
                <h4>Edit Station: {{ editStationForm.name }}</h4>
                <div class="form-grid-two">
                  <div class="form-group">
                    <label>Station Name</label>
                    <input v-model="editStationForm.name" type="text" placeholder="Station name" />
                  </div>
                  <div class="form-group">
                    <label>City</label>
                    <input v-model="editStationForm.city" type="text" placeholder="City" />
                  </div>
                  <div class="form-group">
                    <label>Email</label>
                    <input v-model="editStationForm.email" type="email" placeholder="Email" />
                  </div>
                  <div class="form-group">
                    <label>Phone</label>
                    <input v-model="editStationForm.phone" type="text" placeholder="Phone" />
                  </div>
                  <div class="form-group">
                    <label>Address</label>
                    <input v-model="editStationForm.address" type="text" placeholder="Address" />
                  </div>
                  <div class="form-group">
                    <label>Postal Code</label>
                    <input v-model="editStationForm.postalCode" type="text" placeholder="Postal code" />
                  </div>
                </div>
                <div class="form-actions">
                  <button class="btn-submit" @click="saveStationEdit">Save Changes</button>
                  <button class="btn-cancel" @click="cancelStationEdit">Cancel</button>
                </div>
              </div>
            </div>

            <div class="stations-table" v-if="filteredStations.length > 0">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>ID</th>
                    <th>City</th>
                    <th>Contacts</th>
                    <th>Usage</th>
                    <th>
                      <button class="sort-header-btn" @click="toggleStationTenantSort('id')">
                        Tenant ID {{ stationTenantSortBy === 'id' ? (stationTenantSortDir === 'asc' ? '↑' : '↓') : '' }}
                      </button>
                    </th>
                    <th>
                      <button class="sort-header-btn" @click="toggleStationTenantSort('code')">
                        Tenant Code {{ stationTenantSortBy === 'code' ? (stationTenantSortDir === 'asc' ? '↑' : '↓') : '' }}
                      </button>
                    </th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="station in paginatedStations" :key="station.id">
                    <td>{{ station.name }}</td>
                    <td>#{{ station.id }}</td>
                    <td>{{ station.city || '-' }}</td>
                    <td>{{ station.email || '-' }} / {{ station.phone || '-' }}</td>
                    <td>{{ station._count?.users || 0 }} users · {{ station._count?.vehicles || 0 }} vehicles</td>
                    <td>{{ station.tenantId ?? '-' }}</td>
                    <td>{{ station.tenant?.code || '-' }}</td>
                    <td><span :class="['status-badge', station.isActive ? 'active' : 'inactive']">{{ station.isActive ? 'ACTIVE' : 'INACTIVE' }}</span></td>
                    <td class="actions-cell">
                      <div class="action-buttons">
                        <button class="btn-edit" @click="editStation(station)">Edit</button>
                        <button class="btn-status" @click="openStationStatusModal(station)">Status</button>
                        <button class="btn-delete" @click="deleteStation(station.id)">Delete</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div v-if="stationTotalPages > 1" class="table-pagination">
                <button
                  class="page-btn page-nav"
                  :disabled="stationPage === 1"
                  @click="stationPage = 1"
                >
                  &lt;&lt;
                </button>
                <button
                  class="page-btn page-nav"
                  :disabled="stationPage === 1"
                  @click="stationPage = Math.max(1, stationPage - 1)"
                >
                  &lt;
                </button>

                <button
                  v-for="page in stationPageNumbers"
                  :key="page"
                  class="page-btn"
                  :class="{ active: page === stationPage }"
                  @click="stationPage = page"
                >
                  {{ page }}
                </button>

                <button
                  class="page-btn page-nav"
                  :disabled="stationPage === stationTotalPages"
                  @click="stationPage = Math.min(stationTotalPages, stationPage + 1)"
                >
                  &gt;
                </button>
                <button
                  class="page-btn page-nav"
                  :disabled="stationPage === stationTotalPages"
                  @click="stationPage = stationTotalPages"
                >
                  &gt;&gt;
                </button>
              </div>
            </div>
            <div v-else class="empty-message">{{ stations.length === 0 ? 'No stations found' : 'No stations match current filters' }}</div>
          </div>
        </div>

        <!-- ACTIVITY LOGS -->
        <div v-show="activeTab === 'logs'" class="tab-panel">
          <h3>Activity Logs</h3>
          <div class="logs-section">
            <div class="logs-actions">
              <div class="logs-filter">
                <input v-model="logFilter" type="text" placeholder="Search logs..." />
                <input v-model="logTenantIdFilter" type="text" placeholder="Tenant ID" />
                <input v-model="logTenantCodeFilter" type="text" placeholder="Tenant code" />
                <select v-model="logLevel">
                  <option value="">All Actions</option>
                  <option value="user.created">User Created</option>
                  <option value="user.updated">User Updated</option>
                  <option value="user.deleted">User Deleted</option>
                  <option value="staff.activated">Staff Activated</option>
                  <option value="staff.suspended">Staff Suspended</option>
                  <option value="staff.deactivated">Staff Deactivated</option>
                  <option value="station.created">Station Created</option>
                  <option value="station.updated">Station Updated</option>
                  <option value="station.deleted">Station Deleted</option>
                  <option value="permission.granted">Permission Granted</option>
                  <option value="permission.revoked">Permission Revoked</option>
                </select>
                <select v-model="logSortBy">
                  <option value="timestamp">Sort: Timestamp</option>
                  <option value="action">Sort: Action</option>
                  <option value="tenantId">Sort: Tenant ID</option>
                  <option value="tenantCode">Sort: Tenant Code</option>
                </select>
                <select v-model="logSortDir">
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </div>
              <div class="logs-buttons">
                <button class="btn-action" @click="loadActivityLogs">Apply Filters</button>
                <button class="btn-action" @click="loadActivityLogs">Refresh</button>
                <button class="btn-cancel" @click="clearLogFilters">Clear Filters</button>
                <button class="btn-export" @click="exportLogs">Export CSV</button>
                <button class="btn-clear" @click="clearLogs">Clear Logs</button>
              </div>
            </div>
            <div class="logs-list" v-if="filteredLogs.length > 0">
              <div v-for="log in filteredLogs" :key="log.id" class="log-entry">
                <span class="log-time">{{ new Date(log.timestamp).toLocaleString() }}</span>
                <span class="log-action">{{ log.action }}</span>
                <span class="log-subject">{{ formatLogSubject(log) }}</span>
                <span class="log-user">User: {{ log.userCode || log.userId }}</span>
                <span class="log-user">Tenant ID: {{ log.tenantId ?? '-' }}</span>
                <span class="log-user">Tenant: {{ log.tenantCode || '-' }}</span>
              </div>
            </div>
            <div v-else class="empty-message">No activity logs found</div>
          </div>
        </div>

        <!-- SYSTEM INFO -->
        <div v-show="activeTab === 'system'" class="tab-panel">
          <h3>System Information</h3>
          <div class="system-info-grid">
            <div class="info-card">
              <div class="info-label">Active Users</div>
              <div class="info-value">{{ systemInfo.activeUsers }}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Total Requests</div>
              <div class="info-value">{{ systemInfo.totalRequests.toLocaleString() }}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Database Status</div>
              <div class="info-value">
                <span :class="['status-badge', systemInfo.databaseStatus === 'CONNECTED' ? 'active' : 'inactive']">{{ systemInfo.databaseStatus }}</span>
              </div>
            </div>
            <div class="info-card">
              <div class="info-label">API Status</div>
              <div class="info-value">
                <span :class="['status-badge', systemInfo.apiStatus === 'RUNNING' ? 'active' : 'inactive']">{{ systemInfo.apiStatus }}</span>
              </div>
            </div>
            <div class="info-card">
              <div class="info-label">Total Users</div>
              <div class="info-value">{{ systemInfo.totalUsers }}</div>
            </div>
            <div class="info-card">
              <div class="info-label">Total Stations</div>
              <div class="info-value">{{ systemInfo.totalStations }}</div>
            </div>
          </div>

          <div class="system-actions">
            <button class="btn-action" @click="restartServices">Restart Services</button>
            <button class="btn-action" @click="exportLogs">Export System Logs</button>
          </div>
        </div>

        <div v-if="showStatusModal" class="modal-overlay" @click="closeStatusModal">
          <div class="modal-card modal-small" @click.stop>
            <h4>Change Account Status</h4>
            <p class="modal-description">
              {{ statusModalTarget?.userCode || statusModalTarget?.id }} · current {{ statusModalTarget?.status || 'UNKNOWN' }}
            </p>
            <div class="form-group">
              <label>New Status</label>
              <select v-model="statusModalNextStatus">
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div class="form-actions">
              <button class="btn-submit" @click="confirmStatusChange">Apply</button>
              <button class="btn-cancel" @click="closeStatusModal">Cancel</button>
            </div>
          </div>
        </div>

        <div v-if="showDeleteConfirmModal" class="modal-overlay" @click="closeDeleteConfirmModal">
          <div class="modal-card modal-small" @click.stop>
            <h4>{{ deleteConfirmTitle }}</h4>
            <p class="modal-description">{{ deleteConfirmMessage }}</p>
            <div class="form-actions">
              <button :class="deleteConfirmButtonClass" @click="confirmDeleteAction">{{ deleteConfirmButtonLabel }}</button>
              <button class="btn-cancel" @click="closeDeleteConfirmModal">Cancel</button>
            </div>
          </div>
        </div>

        <div v-if="showFeedbackModal" class="modal-overlay" @click="closeFeedbackModal">
          <div class="modal-card modal-small" @click.stop>
            <h4 :class="feedbackModalType === 'error' ? 'modal-title-error' : 'modal-title-success'">{{ feedbackModalTitle }}</h4>
            <p class="modal-description">{{ feedbackModalMessage }}</p>
            <div class="form-actions">
              <button class="btn-submit" @click="closeFeedbackModal">OK</button>
            </div>
          </div>
        </div>

        <div v-if="showStationStatusModal" class="modal-overlay" @click="closeStationStatusModal">
          <div class="modal-card modal-small" @click.stop>
            <h4>Change Station Status</h4>
            <p class="modal-description">
              {{ stationStatusTarget?.name }} (#{{ stationStatusTarget?.id }})
            </p>
            <div class="form-group">
              <label>New Status</label>
              <select v-model="stationStatusNextStatus">
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div class="form-actions">
              <button class="btn-submit" @click="confirmStationStatusChange">Apply</button>
              <button class="btn-cancel" @click="closeStationStatusModal">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { COUNTRY_OPTIONS, NATIONALITY_OPTIONS } from '@/constants/geo-options'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('config')
const isDevAdmin = ref(false)
const isLoading = ref(false)
const APIUrl = 'http://localhost:3000'

const getAuthToken = () => {
  const storeToken =
    typeof authStore.token === 'string'
      ? authStore.token
      : (authStore.token as any)?.value

  const localStorageToken = localStorage.getItem('access_token') || localStorage.getItem('accessToken') || ''
  const defaultHeader = (axios.defaults.headers.common['Authorization'] || '').toString()
  const rawToken = (storeToken || localStorageToken || defaultHeader || '').toString().trim()
  const normalized = rawToken.replace(/^Bearer\s+/i, '').replace(/^"|"$/g, '')

  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    return ''
  }

  return normalized
}

const authHeaders = () => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const getCurrentUserId = () => {
  const current = (authStore.user as any)?.value ?? authStore.user
  return Number(current?.id || 0)
}

const isCurrentUser = (id: number) => Number(id) === getCurrentUserId()

const tabs = [
  { id: 'config', name: 'Configuration' },
  { id: 'tenants', name: 'Tenants' },
  { id: 'users', name: 'Users' },
  { id: 'stations', name: 'Stations' },
  { id: 'logs', name: 'Activity Logs' },
  { id: 'system', name: 'System Info' },
]

// Configuration
const config = ref({
  systemName: 'FleetGate',
  apiUrl: 'http://localhost:3000',
  dbHost: 'localhost',
  debugMode: false,
})

// Tenants Management
const tenants = ref<any[]>([])
const tenantNameFilter = ref('')
const tenantCodeFilter = ref('')
const tenantDbModeFilter = ref('')
const tenantStatusFilter = ref('')
const createEmptyTenant = () => ({
  code: '',
  name: '',
  dbMode: 'SHARED',
  isActive: true,
  dbName: '',
  dbHost: '',
  dbPort: '',
  dbUser: '',
  dbPassword: '',
  dbUrl: '',
  notes: '',
})
const newTenant = ref(createEmptyTenant())
const showAddTenantForm = ref(false)
const showEditTenantForm = ref(false)
const editingTenantId = ref<number | null>(null)
const editTenantForm = ref(createEmptyTenant())

// Users Management
const users = ref<any[]>([])
const userNameFilter = ref('')
const userEmailFilter = ref('')
const userRoleFilter = ref('')
const userStatusFilter = ref('ACTIVE')
const userLastLoginFilter = ref('')
const userStationFilter = ref('')
const userTenantIdFilter = ref('')
const userTenantCodeFilter = ref('')
const createEmptyNewUser = () => ({
  username: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phoneCountryCode: '351',
  phone: '',
  alternativePhone: '',
  email: '',
  nif: '',
  nationality: '',
  dateOfBirth: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'Portugal',
  licenseNumber: '',
  licenseExpiry: '',
  licenseIssueDate: '',
  licenseCountry: '',
  idDocumentType: 'CC',
  idCardNumber: '',
  idCardExpiry: '',
  employeeNumber: '',
  hireDate: '',
  role: 'CLIENT',
  stationId: '',
})

const newUser = ref(createEmptyNewUser())
const showAddUserForm = ref(false)
const showNationalityDropdown = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const userFormError = ref('')
const userFormSuccess = ref('')
const showEditUserForm = ref(false)
const editingUserId = ref<number | null>(null)
const createEmptyEditUser = () => ({
  userCode: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  lastName: '',
  phoneCountryCode: '',
  phone: '',
  alternativePhone: '',
  email: '',
  nif: '',
  nationality: '',
  dateOfBirth: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  licenseNumber: '',
  licenseExpiry: '',
  licenseIssueDate: '',
  licenseCountry: '',
  idDocumentType: 'CC',
  idCardNumber: '',
  idCardExpiry: '',
  employeeNumber: '',
  hireDate: '',
  role: 'CLIENT',
  stationId: '',
})
const editUserForm = ref(createEmptyEditUser())
const showEditNationalityDropdown = ref(false)
const showEditPassword = ref(false)
const showEditConfirmPassword = ref(false)
const editUserFormError = ref('')
const editUserFormSuccess = ref('')
const showStatusModal = ref(false)
const statusModalTarget = ref<any | null>(null)
const statusModalNextStatus = ref('ACTIVE')
const showDeleteConfirmModal = ref(false)
const deleteConfirmTitle = ref('')
const deleteConfirmMessage = ref('')
const deleteConfirmButtonLabel = ref('Delete')
const deleteConfirmButtonClass = ref('btn-delete')
const pendingDeleteAction = ref<null | (() => Promise<void>)>(null)
const showFeedbackModal = ref(false)
const feedbackModalTitle = ref('')
const feedbackModalMessage = ref('')
const feedbackModalType = ref<'success' | 'error'>('success')

// Stations Management
const stations = ref<any[]>([])
const stationNameFilter = ref('')
const stationEmailFilter = ref('')
const stationPhoneFilter = ref('')
const stationCityFilter = ref('')
const stationTenantIdFilter = ref('')
const stationTenantCodeFilter = ref('')
const stationStatusFilter = ref('')
const newStation = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
})
const stationFormError = ref('')
const stationFormSuccess = ref('')
const showAddStationForm = ref(false)
const showEditStationForm = ref(false)
const editingStationId = ref<number | null>(null)
const editStationForm = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
  isActive: true,
})
const showStationStatusModal = ref(false)
const stationStatusTarget = ref<any | null>(null)
const stationStatusNextStatus = ref<'ACTIVE' | 'INACTIVE'>('ACTIVE')

// Logs
const logs = ref<any[]>([])
const logFilter = ref('')
const logLevel = ref('')
const logTenantIdFilter = ref('')
const logTenantCodeFilter = ref('')
const logSortBy = ref<'timestamp' | 'action' | 'tenantId' | 'tenantCode'>('timestamp')
const logSortDir = ref<'asc' | 'desc'>('desc')

// System Info
const systemInfo = ref({
  activeUsers: 0,
  totalRequests: 0,
  totalUsers: 0,
  totalStations: 0,
  databaseStatus: 'UNKNOWN',
  apiStatus: 'UNKNOWN',
})

const parseLogDetails = (details: unknown) => {
  if (!details) return null
  if (typeof details === 'object') return details as Record<string, any>
  if (typeof details !== 'string') return null

  try {
    return JSON.parse(details)
  } catch {
    return null
  }
}

const formatLogSubject = (log: any) => {
  const details = parseLogDetails(log.details)
  if (!details) return log.subject

  if (['staff.activated', 'staff.suspended', 'staff.deactivated'].includes(log.action)) {
    const targetUserCode = details.targetUserCode || log.subject
    const fromStatus = details.fromStatus || '-'
    const toStatus = details.toStatus || '-'
    return `${targetUserCode} (${fromStatus} → ${toStatus})`
  }

  return log.subject
}

const filteredLogs = computed(() => {
  const tenantIdFilter = logTenantIdFilter.value.trim().toLowerCase()
  const tenantCodeFilter = logTenantCodeFilter.value.trim().toLowerCase()

  const filtered = logs.value.filter(log => {
    const details = parseLogDetails(log.details)
    const detailsText = details ? JSON.stringify(details).toLowerCase() : ''
    const searchTerm = logFilter.value.toLowerCase()
    const matchesFilter = log.action?.toLowerCase().includes(searchTerm) ||
                         log.subject?.toLowerCase().includes(searchTerm) ||
                         detailsText.includes(searchTerm)
    const matchesLevel = !logLevel.value || log.action === logLevel.value
    const tenantIdText = String(log.tenantId ?? '').toLowerCase()
    const tenantCodeText = String(log.tenantCode ?? '').toLowerCase()
    const matchesTenantId = !tenantIdFilter || tenantIdText.includes(tenantIdFilter)
    const matchesTenantCode = !tenantCodeFilter || tenantCodeText.includes(tenantCodeFilter)
    return matchesFilter && matchesLevel && matchesTenantId && matchesTenantCode
  })

  const sorted = [...filtered]
  sorted.sort((left, right) => {
    let leftValue: string | number = ''
    let rightValue: string | number = ''

    if (logSortBy.value === 'timestamp') {
      leftValue = new Date(left.timestamp).getTime()
      rightValue = new Date(right.timestamp).getTime()
    } else if (logSortBy.value === 'action') {
      leftValue = String(left.action ?? '').toLowerCase()
      rightValue = String(right.action ?? '').toLowerCase()
    } else if (logSortBy.value === 'tenantId') {
      leftValue = Number(left.tenantId ?? -1)
      rightValue = Number(right.tenantId ?? -1)
    } else {
      leftValue = String(left.tenantCode ?? '').toLowerCase()
      rightValue = String(right.tenantCode ?? '').toLowerCase()
    }

    if (leftValue < rightValue) {
      return logSortDir.value === 'asc' ? -1 : 1
    }

    if (leftValue > rightValue) {
      return logSortDir.value === 'asc' ? 1 : -1
    }

    return 0
  })

  return sorted
})

const filteredTenants = computed(() => {
  const name = tenantNameFilter.value.trim().toLowerCase()
  const code = tenantCodeFilter.value.trim().toLowerCase()

  return tenants.value.filter((tenant) => {
    const nameMatch = !name || (tenant.name || '').toLowerCase().includes(name)
    const codeMatch = !code || (tenant.code || '').toLowerCase().includes(code)
    const dbModeMatch = !tenantDbModeFilter.value || tenant.dbMode === tenantDbModeFilter.value
    const statusLabel = tenant.isActive ? 'ACTIVE' : 'INACTIVE'
    const statusMatch = !tenantStatusFilter.value || statusLabel === tenantStatusFilter.value
    return nameMatch && codeMatch && dbModeMatch && statusMatch
  })
})

const filteredUsers = computed(() => {
  const nameFilter = userNameFilter.value.trim().toLowerCase()
  const emailFilter = userEmailFilter.value.trim().toLowerCase()
  const tenantIdFilter = userTenantIdFilter.value.trim().toLowerCase()
  const tenantCodeFilter = userTenantCodeFilter.value.trim().toLowerCase()

  return users.value.filter(user => {
    const roleMatch = !userRoleFilter.value || user.role === userRoleFilter.value
    const statusMatch = !userStatusFilter.value || user.status === userStatusFilter.value
    const now = new Date()
    const lastLoginDate = user.lastLoginAt ? new Date(user.lastLoginAt) : null
    const hasLogin = !!lastLoginDate && !Number.isNaN(lastLoginDate.getTime())

    let lastLoginMatch = true
    if (userLastLoginFilter.value === 'NEVER') {
      lastLoginMatch = !hasLogin
    } else if (userLastLoginFilter.value === 'TODAY') {
      if (!hasLogin) {
        lastLoginMatch = false
      } else {
        lastLoginMatch =
          lastLoginDate.getFullYear() === now.getFullYear()
          && lastLoginDate.getMonth() === now.getMonth()
          && lastLoginDate.getDate() === now.getDate()
      }
    } else if (userLastLoginFilter.value === 'LAST_7_DAYS') {
      lastLoginMatch = hasLogin && now.getTime() - lastLoginDate.getTime() <= 7 * 24 * 60 * 60 * 1000
    } else if (userLastLoginFilter.value === 'LAST_30_DAYS') {
      lastLoginMatch = hasLogin && now.getTime() - lastLoginDate.getTime() <= 30 * 24 * 60 * 60 * 1000
    }

    const stationMatch = !userStationFilter.value
      || (userStationFilter.value === '__none__' && !user.stationId)
      || Number(user.stationId) === Number(userStationFilter.value)

    const fullName = [user.firstName, user.lastName, user.fullName, user.userCode]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const email = (user.email || '').toString().toLowerCase()

    const nameMatch = !nameFilter || fullName.includes(nameFilter)
    const emailMatch = !emailFilter || email.includes(emailFilter)
    const tenantIdMatch = !tenantIdFilter || String(user.tenantId ?? '').toLowerCase().includes(tenantIdFilter)
    const tenantCodeMatch = !tenantCodeFilter || String(user.tenantCode ?? '').toLowerCase().includes(tenantCodeFilter)

    return roleMatch && statusMatch && lastLoginMatch && stationMatch && nameMatch && emailMatch && tenantIdMatch && tenantCodeMatch
  })
})

const filteredStaffUsers = computed(() => {
  return filteredUsers.value.filter(user => user.role !== 'CLIENT')
})

const userTenantSortBy = ref<'id' | 'code'>('id')
const userTenantSortDir = ref<'asc' | 'desc'>('asc')

const sortedStaffUsers = computed(() => {
  const sorted = [...filteredStaffUsers.value]

  sorted.sort((left, right) => {
    const leftValue = userTenantSortBy.value === 'id'
      ? Number(left.tenantId ?? -1)
      : String(left.tenantCode ?? '').toLowerCase()
    const rightValue = userTenantSortBy.value === 'id'
      ? Number(right.tenantId ?? -1)
      : String(right.tenantCode ?? '').toLowerCase()

    if (leftValue < rightValue) {
      return userTenantSortDir.value === 'asc' ? -1 : 1
    }

    if (leftValue > rightValue) {
      return userTenantSortDir.value === 'asc' ? 1 : -1
    }

    return 0
  })

  return sorted
})

const toggleUserTenantSort = (field: 'id' | 'code') => {
  if (userTenantSortBy.value === field) {
    userTenantSortDir.value = userTenantSortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }

  userTenantSortBy.value = field
  userTenantSortDir.value = 'asc'
}

const staffPage = ref(1)
const staffPageSize = 8

const staffTotalPages = computed(() => {
  return Math.max(1, Math.ceil(sortedStaffUsers.value.length / staffPageSize))
})

const paginatedStaffUsers = computed(() => {
  const start = (staffPage.value - 1) * staffPageSize
  return sortedStaffUsers.value.slice(start, start + staffPageSize)
})

const staffPageNumbers = computed(() => {
  const maxVisible = 5
  const total = staffTotalPages.value

  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(maxVisible / 2)
  let start = staffPage.value - half
  let end = staffPage.value + half

  if (start < 1) {
    start = 1
    end = maxVisible
  }

  if (end > total) {
    end = total
    start = total - maxVisible + 1
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

watch(sortedStaffUsers, () => {
  if (staffPage.value > staffTotalPages.value) {
    staffPage.value = staffTotalPages.value
  }

  if (staffPage.value < 1) {
    staffPage.value = 1
  }
}, { immediate: true })

const filteredStations = computed(() => {
  const nameFilter = stationNameFilter.value.trim().toLowerCase()
  const emailFilter = stationEmailFilter.value.trim().toLowerCase()
  const phoneFilter = stationPhoneFilter.value.trim().toLowerCase()
  const cityFilter = stationCityFilter.value.trim().toLowerCase()
  const tenantIdFilter = stationTenantIdFilter.value.trim().toLowerCase()
  const tenantCodeFilter = stationTenantCodeFilter.value.trim().toLowerCase()

  return stations.value.filter(station => {
    const status = station.isActive ? 'ACTIVE' : 'INACTIVE'
    const statusMatch = !stationStatusFilter.value || stationStatusFilter.value === status

    const stationName = (station.name || '').toString().toLowerCase()
    const stationEmail = (station.email || '').toString().toLowerCase()
    const stationPhone = (station.phone || '').toString().toLowerCase()
    const stationCity = (station.city || '').toString().toLowerCase()

    const nameMatch = !nameFilter || stationName.includes(nameFilter)
    const emailMatch = !emailFilter || stationEmail.includes(emailFilter)
    const phoneMatch = !phoneFilter || stationPhone.includes(phoneFilter)
    const cityMatch = !cityFilter || stationCity.includes(cityFilter)
    const tenantIdMatch = !tenantIdFilter || String(station.tenantId ?? '').toLowerCase().includes(tenantIdFilter)
    const tenantCodeMatch = !tenantCodeFilter || String(station.tenant?.code ?? '').toLowerCase().includes(tenantCodeFilter)

    return statusMatch && nameMatch && emailMatch && phoneMatch && cityMatch && tenantIdMatch && tenantCodeMatch
  })
})

const stationTenantSortBy = ref<'id' | 'code'>('id')
const stationTenantSortDir = ref<'asc' | 'desc'>('asc')

const sortedStations = computed(() => {
  const sorted = [...filteredStations.value]

  sorted.sort((left, right) => {
    const leftValue = stationTenantSortBy.value === 'id'
      ? Number(left.tenantId ?? -1)
      : String(left.tenant?.code ?? '').toLowerCase()
    const rightValue = stationTenantSortBy.value === 'id'
      ? Number(right.tenantId ?? -1)
      : String(right.tenant?.code ?? '').toLowerCase()

    if (leftValue < rightValue) {
      return stationTenantSortDir.value === 'asc' ? -1 : 1
    }

    if (leftValue > rightValue) {
      return stationTenantSortDir.value === 'asc' ? 1 : -1
    }

    return 0
  })

  return sorted
})

const toggleStationTenantSort = (field: 'id' | 'code') => {
  if (stationTenantSortBy.value === field) {
    stationTenantSortDir.value = stationTenantSortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }

  stationTenantSortBy.value = field
  stationTenantSortDir.value = 'asc'
}

const stationPage = ref(1)
const stationPageSize = 8

const stationTotalPages = computed(() => {
  return Math.max(1, Math.ceil(sortedStations.value.length / stationPageSize))
})

const paginatedStations = computed(() => {
  const start = (stationPage.value - 1) * stationPageSize
  return sortedStations.value.slice(start, start + stationPageSize)
})

const stationPageNumbers = computed(() => {
  const maxVisible = 5
  const total = stationTotalPages.value

  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const half = Math.floor(maxVisible / 2)
  let start = stationPage.value - half
  let end = stationPage.value + half

  if (start < 1) {
    start = 1
    end = maxVisible
  }

  if (end > total) {
    end = total
    start = total - maxVisible + 1
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

watch(sortedStations, () => {
  if (stationPage.value > stationTotalPages.value) {
    stationPage.value = stationTotalPages.value
  }

  if (stationPage.value < 1) {
    stationPage.value = 1
  }
}, { immediate: true })

const filteredNationalities = computed(() => {
  const query = newUser.value.nationality.trim().toLowerCase()
  if (!query) {
    return NATIONALITY_OPTIONS
  }

  return NATIONALITY_OPTIONS.filter((nationality) =>
    nationality.toLowerCase().includes(query),
  )
})

const filteredEditNationalities = computed(() => {
  const query = editUserForm.value.nationality.trim().toLowerCase()
  if (!query) {
    return NATIONALITY_OPTIONS
  }

  return NATIONALITY_OPTIONS.filter((nationality) =>
    nationality.toLowerCase().includes(query),
  )
})

const getApiErrorMessage = (error: any, fallback: string) => {
  const responseMessage = error?.response?.data?.message
  if (Array.isArray(responseMessage)) {
    return responseMessage.join(' | ')
  }

  if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
    return responseMessage
  }

  return error?.message || fallback
}

const normalizeDateInput = (value: string) => {
  const trimmed = (value || '').trim()
  if (!trimmed) return undefined

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  const slashMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return `${year}-${month}-${day}`
  }

  const parsed = Date.parse(trimmed)
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString()
  }

  return undefined
}

const formatDateForInput = (value?: string | null) => {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().split('T')[0]
}

const selectNationality = (nationality: string) => {
  newUser.value.nationality = nationality
  showNationalityDropdown.value = false
}

const selectEditNationality = (nationality: string) => {
  editUserForm.value.nationality = nationality
  showEditNationalityDropdown.value = false
}

const closeNationalityDropdown = () => {
  setTimeout(() => {
    showNationalityDropdown.value = false
  }, 120)
}

const closeEditNationalityDropdown = () => {
  setTimeout(() => {
    showEditNationalityDropdown.value = false
  }, 120)
}

onMounted(async () => {
  authStore.initAuth()

  const token = getAuthToken()
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  isLoading.value = true

  // Check authentication and DEV role
  if (!authStore.isAuthenticated()) {
    router.push('/login')
    return
  }

  const user = authStore.user
  isDevAdmin.value = user?.role === 'DEV'

  if (isDevAdmin.value) {
    await loadConfig()
    await loadTenants()
    await loadUsers()
    await loadStations()
    await loadActivityLogs()
    await loadSystemInfo()
  }

  isLoading.value = false
})

// ===== API CALLS =====

const loadUsers = async () => {
  try {
    const response = await axios.get(`${APIUrl}/users`, {
      headers: authHeaders()
    })
    users.value = response.data || []
  } catch (error) {
    console.error('Error loading users:', error)
  }
}

const loadTenants = async () => {
  try {
    const response = await axios.get(`${APIUrl}/system-config/tenants`, {
      headers: authHeaders(),
    })
    tenants.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('Error loading tenants:', error)
    tenants.value = []
  }
}

const loadStations = async () => {
  try {
    const response = await axios.get(`${APIUrl}/stations`, {
      headers: authHeaders()
    })
    stations.value = response.data || []
  } catch (error) {
    console.error('Error loading stations:', error)
  }
}

const loadActivityLogs = async () => {
  try {
    const response = await axios.get(`${APIUrl}/activity-logs`, {
      params: {
        search: logFilter.value || undefined,
        action: logLevel.value || undefined,
      },
      headers: authHeaders()
    })
    logs.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error('Error loading activity logs:', error)
  }
}

const loadConfig = async () => {
  try {
    const response = await axios.get(`${APIUrl}/system-config`, {
      headers: authHeaders()
    })

    const data = response.data || {}
    config.value = {
      systemName: data.systemName || 'FleetGate',
      apiUrl: data.apiUrl || 'http://localhost:3000',
      dbHost: data.dbHost || 'localhost',
      debugMode: Boolean(data.debugMode),
    }
  } catch (error) {
    console.error('Error loading config:', error)
  }
}

const loadSystemInfo = async () => {
  try {
    const response = await axios.get(`${APIUrl}/system-config/system-info`, {
      headers: authHeaders()
    })
    systemInfo.value = {
      activeUsers: response.data.activeUsers || 0,
      totalRequests: response.data.totalRequests || 0,
      totalUsers: response.data.totalUsers || 0,
      totalStations: response.data.totalStations || 0,
      databaseStatus: response.data.databaseStatus || 'UNKNOWN',
      apiStatus: response.data.apiStatus || 'UNKNOWN',
    }
  } catch (error) {
    console.error('Error loading system info:', error)
  }
}

const saveConfig = async () => {
  try {
    isLoading.value = true
    await axios.put(`${APIUrl}/system-config`, config.value, {
      headers: authHeaders()
    })
    showFeedback('Configuration Saved', 'Configuration saved successfully.')
  } catch (error) {
    console.error('Error saving config:', error)
    showFeedback('Config Saved Locally', 'Configuration saved locally.', 'error')
  } finally {
    isLoading.value = false
  }
}

const openAddTenantForm = () => {
  newTenant.value = createEmptyTenant()
  showAddTenantForm.value = true
}

const closeAddTenantForm = () => {
  showAddTenantForm.value = false
  newTenant.value = createEmptyTenant()
}

const addTenant = async () => {
  if (!newTenant.value.code.trim() || !newTenant.value.name.trim()) {
    showFeedback('Validation Error', 'Tenant code and name are required.', 'error')
    return
  }

  try {
    isLoading.value = true
    await axios.post(`${APIUrl}/system-config/tenants`, {
      ...newTenant.value,
      code: newTenant.value.code.trim().toUpperCase(),
      name: newTenant.value.name.trim(),
    }, {
      headers: authHeaders(),
    })
    closeAddTenantForm()
    await loadTenants()
    showFeedback('Tenant Created', 'Tenant created successfully.')
  } catch (error: any) {
    console.error('Error creating tenant:', error)
    showFeedback('Create Failed', error?.response?.data?.message || error?.message || 'Failed to create tenant.', 'error')
  } finally {
    isLoading.value = false
  }
}

const editTenant = (tenant: any) => {
  editingTenantId.value = tenant.id
  editTenantForm.value = {
    code: tenant.code || '',
    name: tenant.name || '',
    dbMode: tenant.dbMode || 'SHARED',
    isActive: Boolean(tenant.isActive),
    dbName: tenant.dbName || '',
    dbHost: tenant.dbHost || '',
    dbPort: tenant.dbPort || '',
    dbUser: tenant.dbUser || '',
    dbPassword: tenant.dbPassword || '',
    dbUrl: tenant.dbUrl || '',
    notes: tenant.notes || '',
  }
  showEditTenantForm.value = true
}

const cancelTenantEdit = () => {
  showEditTenantForm.value = false
  editingTenantId.value = null
  editTenantForm.value = createEmptyTenant()
}

const saveTenantEdit = async () => {
  if (!editingTenantId.value) return

  if (!editTenantForm.value.code.trim() || !editTenantForm.value.name.trim()) {
    showFeedback('Validation Error', 'Tenant code and name are required.', 'error')
    return
  }

  try {
    isLoading.value = true
    await axios.put(`${APIUrl}/system-config/tenants/${editingTenantId.value}`, {
      ...editTenantForm.value,
      code: editTenantForm.value.code.trim().toUpperCase(),
      name: editTenantForm.value.name.trim(),
    }, {
      headers: authHeaders(),
    })
    cancelTenantEdit()
    await loadTenants()
    showFeedback('Tenant Updated', 'Tenant updated successfully.')
  } catch (error: any) {
    console.error('Error updating tenant:', error)
    showFeedback('Update Failed', error?.response?.data?.message || error?.message || 'Failed to update tenant.', 'error')
  } finally {
    isLoading.value = false
  }
}

const toggleTenantStatus = async (tenant: any) => {
  const nextActive = !tenant.isActive
  const label = nextActive ? 'activate' : 'deactivate'

  const updateStatusAsync = async () => {
    try {
      isLoading.value = true
      await axios.put(`${APIUrl}/system-config/tenants/${tenant.id}`, {
        isActive: nextActive,
      }, {
        headers: authHeaders(),
      })
      await loadTenants()
      showFeedback('Tenant Status Updated', `Tenant ${tenant.code} is now ${nextActive ? 'ACTIVE' : 'INACTIVE'}.`)
    } catch (error: any) {
      console.error('Error updating tenant status:', error)
      showFeedback('Status Update Failed', error?.response?.data?.message || error?.message || 'Failed to update tenant status.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  openConfirmModal(
    'Change Tenant Status',
    `Do you want to ${label} tenant ${tenant.code}?`,
    updateStatusAsync,
    'Confirm',
    'btn-submit',
  )
}

const deleteTenant = (tenant: any) => {
  const deleteTenantAsync = async () => {
    try {
      isLoading.value = true
      await axios.delete(`${APIUrl}/system-config/tenants/${tenant.id}`, {
        headers: authHeaders(),
      })
      await loadTenants()
      showFeedback('Tenant Deleted', `Tenant ${tenant.code} deleted successfully.`)
    } catch (error: any) {
      console.error('Error deleting tenant:', error)
      showFeedback('Delete Failed', error?.response?.data?.message || error?.message || 'Failed to delete tenant.', 'error')
    } finally {
      isLoading.value = false
    }
  }

  openConfirmModal(
    'Delete Tenant',
    `Are you sure you want to delete tenant ${tenant.code}?`,
    deleteTenantAsync,
    'Delete',
    'btn-delete',
  )
}

const resetNewUserForm = () => {
  newUser.value = createEmptyNewUser()
  showNationalityDropdown.value = false
  showPassword.value = false
  showConfirmPassword.value = false
  userFormError.value = ''
  userFormSuccess.value = ''
}

const resetEditUserForm = () => {
  editUserForm.value = createEmptyEditUser()
  showEditNationalityDropdown.value = false
  showEditPassword.value = false
  showEditConfirmPassword.value = false
  editUserFormError.value = ''
  editUserFormSuccess.value = ''
}

const openAddUserForm = () => {
  resetNewUserForm()
  showAddUserForm.value = true
}

const closeAddUserForm = () => {
  showAddUserForm.value = false
  resetNewUserForm()
}

const createEmptyNewStation = () => ({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
})

const resetNewStationForm = () => {
  newStation.value = createEmptyNewStation()
  stationFormError.value = ''
  stationFormSuccess.value = ''
}

const closeAddStationForm = () => {
  showAddStationForm.value = false
  resetNewStationForm()
}

const toggleAddStationForm = () => {
  if (showAddStationForm.value) {
    closeAddStationForm()
    return
  }

  resetNewStationForm()
  showAddStationForm.value = true
}

const addUser = async () => {
  userFormError.value = ''
  userFormSuccess.value = ''

  const phoneCountryCodeDigits = (newUser.value.phoneCountryCode || '').replace(/\D/g, '')
  const phoneDigits = (newUser.value.phone || '').replace(/\D/g, '')
  const composedPhone = `${phoneCountryCodeDigits}${phoneDigits}`

  if (!newUser.value.username || !newUser.value.firstName || !newUser.value.lastName || !phoneDigits || !newUser.value.role || !newUser.value.password) {
    userFormError.value = 'Please fill in username, password, name, phone and role.'
    return
  }

  if (!phoneCountryCodeDigits) {
    userFormError.value = 'Country code is required before phone number.'
    return
  }

  if (!/^[A-Za-z0-9]+$/.test(newUser.value.username)) {
    userFormError.value = 'Username must contain only letters and numbers.'
    return
  }

  if (newUser.value.password.length < 8) {
    userFormError.value = 'Password must have at least 8 characters.'
    return
  }

  if (newUser.value.password !== newUser.value.confirmPassword) {
    userFormError.value = 'Password and confirm password must match.'
    return
  }

  if (!/^\d{9,15}$/.test(composedPhone)) {
    userFormError.value = 'Phone with country code must have 9 to 15 digits.'
    return
  }

  try {
    isLoading.value = true
    const response = await axios.post(`${APIUrl}/users`, {
      userCode: newUser.value.username.toUpperCase().trim(),
      firstName: newUser.value.firstName,
      lastName: newUser.value.lastName,
      phone: composedPhone,
      alternativePhone: newUser.value.alternativePhone ? newUser.value.alternativePhone.replace(/\D/g, '') : undefined,
      email: newUser.value.email || undefined,
      nif: newUser.value.role === 'CLIENT' ? newUser.value.nif || undefined : undefined,
      nationality: newUser.value.role === 'CLIENT' ? newUser.value.nationality || undefined : undefined,
      dateOfBirth: normalizeDateInput(newUser.value.dateOfBirth),
      address: newUser.value.address || undefined,
      city: newUser.value.city || undefined,
      postalCode: newUser.value.postalCode || undefined,
      country: newUser.value.country || undefined,
      licenseNumber: newUser.value.role === 'CLIENT' ? newUser.value.licenseNumber || undefined : undefined,
      licenseExpiry: newUser.value.role === 'CLIENT' ? normalizeDateInput(newUser.value.licenseExpiry) : undefined,
      licenseIssueDate: newUser.value.role === 'CLIENT' ? normalizeDateInput(newUser.value.licenseIssueDate) : undefined,
      licenseCountry: newUser.value.role === 'CLIENT' ? newUser.value.licenseCountry || undefined : undefined,
      idCardNumber: newUser.value.role === 'CLIENT' ? newUser.value.idCardNumber || undefined : undefined,
      idCardExpiry: newUser.value.role === 'CLIENT' ? normalizeDateInput(newUser.value.idCardExpiry) : undefined,
      hireDate: newUser.value.role !== 'CLIENT' ? normalizeDateInput(newUser.value.hireDate) : undefined,
      password: newUser.value.password,
      role: newUser.value.role,
      stationId: newUser.value.stationId ? Number(newUser.value.stationId) : undefined,
    }, {
      headers: authHeaders()
    })
    
    users.value.push(response.data)
    resetNewUserForm()
    userFormSuccess.value = 'User created successfully!'
    await loadUsers()
    await loadSystemInfo()
  } catch (error: any) {
    console.error('Error creating user:', error)
    userFormError.value = getApiErrorMessage(error, 'Failed to create user.')
  } finally {
    isLoading.value = false
  }
}

const editUser = (user: any) => {
  resetEditUserForm()
  editingUserId.value = user.id
  const phoneDigits = (user.phone || '').toString().replace(/\D/g, '')
  const countryCode = phoneDigits.length > 9 ? phoneDigits.slice(0, phoneDigits.length - 9) : ''
  const phoneNumber = phoneDigits.length > 9 ? phoneDigits.slice(-9) : phoneDigits
  editUserForm.value = {
    userCode: user.userCode || '',
    password: '',
    confirmPassword: '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phoneCountryCode: countryCode,
    phone: phoneNumber,
    alternativePhone: user.alternativePhone || '',
    email: user.email || '',
    nif: user.nif || '',
    nationality: user.nationality || '',
    dateOfBirth: formatDateForInput(user.dateOfBirth),
    address: user.address || '',
    city: user.city || '',
    postalCode: user.postalCode || '',
    country: user.country || '',
    licenseNumber: user.licenseNumber || '',
    licenseExpiry: formatDateForInput(user.licenseExpiry),
    licenseIssueDate: formatDateForInput(user.licenseIssueDate),
    licenseCountry: user.licenseCountry || '',
    idDocumentType: 'CC',
    idCardNumber: user.idCardNumber || '',
    idCardExpiry: formatDateForInput(user.idCardExpiry),
    employeeNumber: user.employeeNumber || '',
    hireDate: formatDateForInput(user.hireDate),
    role: user.role || 'CLIENT',
    stationId: user.stationId ? String(user.stationId) : '',
  }
  showEditUserForm.value = true
}

const saveUserEdit = async () => {
  if (!editingUserId.value) return

  editUserFormError.value = ''
  editUserFormSuccess.value = ''

  const phoneCountryCodeDigits = (editUserForm.value.phoneCountryCode || '').replace(/\D/g, '')
  const phoneDigits = (editUserForm.value.phone || '').replace(/\D/g, '')
  const composedPhone = `${phoneCountryCodeDigits}${phoneDigits}`

  if (!editUserForm.value.userCode || !editUserForm.value.firstName || !editUserForm.value.lastName || !phoneDigits) {
    editUserFormError.value = 'Please fill in username, name, and phone.'
    return
  }

  if (!/^[A-Za-z0-9]+$/.test(editUserForm.value.userCode)) {
    editUserFormError.value = 'Username must contain only letters and numbers.'
    return
  }

  if (editUserForm.value.password || editUserForm.value.confirmPassword) {
    if (editUserForm.value.password.length < 8) {
      editUserFormError.value = 'Password must have at least 8 characters.'
      return
    }

    if (editUserForm.value.password !== editUserForm.value.confirmPassword) {
      editUserFormError.value = 'Password and confirm password must match.'
      return
    }
  }

  if (!/^[0-9]{9,15}$/.test(composedPhone)) {
    editUserFormError.value = 'Phone with country code must have 9 to 15 digits.'
    return
  }

  try {
    isLoading.value = true
    await axios.patch(`${APIUrl}/users/${editingUserId.value}`, {
      userCode: editUserForm.value.userCode.toUpperCase().trim(),
      firstName: editUserForm.value.firstName,
      lastName: editUserForm.value.lastName,
      phone: composedPhone,
      alternativePhone: editUserForm.value.alternativePhone ? editUserForm.value.alternativePhone.replace(/\D/g, '') : undefined,
      email: editUserForm.value.email || undefined,
      nif: editUserForm.value.nif || undefined,
      nationality: editUserForm.value.nationality || undefined,
      dateOfBirth: normalizeDateInput(editUserForm.value.dateOfBirth),
      address: editUserForm.value.address || undefined,
      city: editUserForm.value.city || undefined,
      postalCode: editUserForm.value.postalCode || undefined,
      country: editUserForm.value.country || undefined,
      licenseNumber: editUserForm.value.role === 'CLIENT' ? editUserForm.value.licenseNumber || undefined : undefined,
      licenseExpiry: editUserForm.value.role === 'CLIENT' ? normalizeDateInput(editUserForm.value.licenseExpiry) : undefined,
      licenseIssueDate: editUserForm.value.role === 'CLIENT' ? normalizeDateInput(editUserForm.value.licenseIssueDate) : undefined,
      licenseCountry: editUserForm.value.role === 'CLIENT' ? editUserForm.value.licenseCountry || undefined : undefined,
      idCardNumber: editUserForm.value.role === 'CLIENT' ? editUserForm.value.idCardNumber || undefined : undefined,
      idCardExpiry: editUserForm.value.role === 'CLIENT' ? normalizeDateInput(editUserForm.value.idCardExpiry) : undefined,
      employeeNumber: editUserForm.value.role !== 'CLIENT' ? editUserForm.value.employeeNumber || undefined : undefined,
      hireDate: editUserForm.value.role !== 'CLIENT' ? normalizeDateInput(editUserForm.value.hireDate) : undefined,
      role: editUserForm.value.role,
      stationId: editUserForm.value.stationId ? Number(editUserForm.value.stationId) : undefined,
      password: editUserForm.value.password || undefined,
    }, {
      headers: authHeaders()
    })

    editUserFormSuccess.value = 'User updated successfully!'
    await loadUsers()
    await loadSystemInfo()
  } catch (error: any) {
    console.error('Error updating user:', error)
    editUserFormError.value = getApiErrorMessage(error, 'Failed to update user.')
  } finally {
    isLoading.value = false
  }
}

const cancelUserEdit = () => {
  showEditUserForm.value = false
  editingUserId.value = null
  resetEditUserForm()
}

const showFeedback = (title: string, message: string, type: 'success' | 'error' = 'success') => {
  feedbackModalTitle.value = title
  feedbackModalMessage.value = message
  feedbackModalType.value = type
  showFeedbackModal.value = true
}

const closeFeedbackModal = () => {
  showFeedbackModal.value = false
  feedbackModalTitle.value = ''
  feedbackModalMessage.value = ''
  feedbackModalType.value = 'success'
}

const openDeleteConfirmModal = (title: string, message: string, action: () => Promise<void>) => {
  openConfirmModal(title, message, action, 'Delete', 'btn-delete')
}

const openConfirmModal = (
  title: string,
  message: string,
  action: () => Promise<void>,
  buttonLabel = 'Confirm',
  buttonClass = 'btn-submit',
) => {
  deleteConfirmTitle.value = title
  deleteConfirmMessage.value = message
  deleteConfirmButtonLabel.value = buttonLabel
  deleteConfirmButtonClass.value = buttonClass
  pendingDeleteAction.value = action
  showDeleteConfirmModal.value = true
}

const closeDeleteConfirmModal = () => {
  showDeleteConfirmModal.value = false
  deleteConfirmTitle.value = ''
  deleteConfirmMessage.value = ''
  deleteConfirmButtonLabel.value = 'Delete'
  deleteConfirmButtonClass.value = 'btn-delete'
  pendingDeleteAction.value = null
}

const confirmDeleteAction = async () => {
  if (!pendingDeleteAction.value) return
  const action = pendingDeleteAction.value
  closeDeleteConfirmModal()
  await action()
}

const deleteUser = (id: number) => {
  if (isCurrentUser(id)) {
    showFeedback('Action Not Allowed', 'You cannot delete your own account while logged in.', 'error')
    return
  }

  const deleteUserAsync = async () => {
    try {
      const token = getAuthToken()
      if (!token) {
        showFeedback('Session Expired', 'Please login again.', 'error')
        router.push('/login')
        return
      }

      isLoading.value = true
      await axios.delete(`${APIUrl}/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      users.value = users.value.filter((user) => user.id !== id)
      showFeedback('User Deleted', 'User deleted successfully.')

      try {
        await loadUsers()
        await loadSystemInfo()
      } catch (refreshError) {
        console.error('Post-delete refresh failed:', refreshError)
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        try {
          const token = getAuthToken()
          if (token) {
            await axios.delete(`${APIUrl}/users/${id}`, {
              headers: { Authorization: `Bearer ${token}` }
            })

            users.value = users.value.filter((user) => user.id !== id)
            showFeedback('User Deleted', 'User deleted successfully.')

            try {
              await loadUsers()
              await loadSystemInfo()
            } catch (refreshError) {
              console.error('Post-retry refresh failed:', refreshError)
            }
            return
          }
        } catch (retryError) {
          console.error('Retry delete failed:', retryError)
        }
      }

      console.error('Error deleting user:', error)
      showFeedback('Delete Failed', `Failed to delete user: ${error.response?.data?.message || error.message}`, 'error')
    } finally {
      isLoading.value = false
    }
  }

  openDeleteConfirmModal('Delete User', 'Are you sure you want to delete this user?', deleteUserAsync)
}

const changeStaffStatus = async (user: any) => {
  if (isCurrentUser(user.id)) {
    showFeedback('Action Not Allowed', 'You cannot change your own account status while logged in.', 'error')
    return
  }

  statusModalTarget.value = user
  statusModalNextStatus.value = (user.status || 'ACTIVE').toUpperCase()
  showStatusModal.value = true
}

const closeStatusModal = () => {
  showStatusModal.value = false
  statusModalTarget.value = null
  statusModalNextStatus.value = 'ACTIVE'
}

const confirmStatusChange = async () => {
  if (!statusModalTarget.value) return

  const user = statusModalTarget.value
  const currentStatus = (user.status || '').toUpperCase()
  const nextStatus = statusModalNextStatus.value.toUpperCase()

  if (!['ACTIVE', 'SUSPENDED', 'INACTIVE'].includes(nextStatus)) {
    showFeedback('Invalid Status', 'Use ACTIVE, SUSPENDED or INACTIVE.', 'error')
    return
  }

  if (nextStatus === currentStatus) {
    showFeedback('No Changes', 'Selected status is already the current one.', 'error')
    return
  }

  try {
    isLoading.value = true

    const endpoint = nextStatus === 'ACTIVE'
      ? 'activate'
      : nextStatus === 'SUSPENDED'
        ? 'suspend'
        : 'deactivate'

    await axios.patch(`${APIUrl}/users/staff/${user.id}/${endpoint}`, {}, {
      headers: authHeaders(),
    })

    closeStatusModal()
    await loadUsers()
    await loadSystemInfo()
    showFeedback('Status Updated', `Account status changed to ${nextStatus}.`)
  } catch (error: any) {
    console.error('Error changing staff status:', error)
    showFeedback('Status Update Failed', `Failed to change account status: ${error.response?.data?.message || error.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const addStation = async () => {
  stationFormError.value = ''
  stationFormSuccess.value = ''

  if (!newStation.value.name?.trim()) {
    stationFormError.value = 'Station name is required.'
    return
  }

  try {
    isLoading.value = true
    const response = await axios.post(`${APIUrl}/stations`, {
      name: newStation.value.name.trim(),
      email: newStation.value.email?.trim() || undefined,
      phone: newStation.value.phone?.trim() || undefined,
      address: newStation.value.address?.trim() || undefined,
      city: newStation.value.city?.trim() || undefined,
      postalCode: newStation.value.postalCode?.trim() || undefined,
      isActive: true,
    }, {
      headers: authHeaders()
    })
    
    stations.value.push(response.data)
    resetNewStationForm()
    stationFormSuccess.value = 'Station created successfully!'
    await loadStations()
    await loadSystemInfo()
  } catch (error: any) {
    console.error('Error creating station:', error)
    stationFormError.value = error.response?.data?.message || error.message || 'Failed to create station.'
  } finally {
    isLoading.value = false
  }
}

const editStation = (station: any) => {
  editingStationId.value = station.id
  editStationForm.value = {
    name: station.name || '',
    email: station.email || '',
    phone: station.phone || '',
    address: station.address || '',
    city: station.city || '',
    postalCode: station.postalCode || '',
    isActive: Boolean(station.isActive),
  }
  showEditStationForm.value = true
}

const saveStationEdit = async () => {
  if (!editingStationId.value) return

  if (!editStationForm.value.name?.trim()) {
    showFeedback('Validation Error', 'Station name is required.', 'error')
    return
  }

  try {
    isLoading.value = true
    await axios.patch(`${APIUrl}/stations/${editingStationId.value}`, {
      name: editStationForm.value.name.trim(),
      email: editStationForm.value.email?.trim() || undefined,
      phone: editStationForm.value.phone?.trim() || undefined,
      address: editStationForm.value.address?.trim() || undefined,
      city: editStationForm.value.city?.trim() || undefined,
      postalCode: editStationForm.value.postalCode?.trim() || undefined,
    }, {
      headers: authHeaders()
    })
    showFeedback('Station Updated', 'Station updated successfully.')
    showEditStationForm.value = false
    editingStationId.value = null
    await loadStations()
    await loadSystemInfo()
  } catch (error: any) {
    console.error('Error updating station:', error)
    showFeedback('Update Failed', `Failed to update station: ${error.response?.data?.message || error.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const cancelStationEdit = () => {
  showEditStationForm.value = false
  editingStationId.value = null
}

const openStationStatusModal = (station: any) => {
  stationStatusTarget.value = station
  stationStatusNextStatus.value = station.isActive ? 'ACTIVE' : 'INACTIVE'
  showStationStatusModal.value = true
}

const closeStationStatusModal = () => {
  showStationStatusModal.value = false
  stationStatusTarget.value = null
  stationStatusNextStatus.value = 'ACTIVE'
}

const confirmStationStatusChange = async () => {
  if (!stationStatusTarget.value) return

  const station = stationStatusTarget.value
  const nextIsActive = stationStatusNextStatus.value === 'ACTIVE'

  if (Boolean(station.isActive) === nextIsActive) {
    showFeedback('No Changes', 'Selected status is already the current one.', 'error')
    return
  }

  try {
    isLoading.value = true
    await axios.patch(`${APIUrl}/stations/${station.id}`, {
      isActive: nextIsActive,
    }, {
      headers: authHeaders(),
    })
    closeStationStatusModal()
    await loadStations()
    await loadSystemInfo()
    showFeedback('Station Status Updated', `Station status changed to ${stationStatusNextStatus.value}.`)
  } catch (error: any) {
    console.error('Error changing station status:', error)
    showFeedback('Status Update Failed', `Failed to change station status: ${error.response?.data?.message || error.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const deleteStation = (id: number) => {
  const deleteStationAsync = async () => {
    try {
      isLoading.value = true
      await axios.delete(`${APIUrl}/stations/${id}`, {
        headers: authHeaders()
      })
      showFeedback('Station Deleted', 'Station deleted successfully.')
      await loadStations()
      await loadSystemInfo()
    } catch (error: any) {
      console.error('Error deleting station:', error)
      showFeedback('Delete Failed', `Failed to delete station: ${error.response?.data?.message || error.message}`, 'error')
    } finally {
      isLoading.value = false
    }
  }

  openDeleteConfirmModal('Delete Station', 'Are you sure you want to delete this station?', deleteStationAsync)
}

const exportLogs = () => {
  if (filteredLogs.value.length === 0) {
    showFeedback('No Logs', 'No logs to export.', 'error')
    return
  }

  const csv = 'Timestamp,Action,Subject,User ID,User Code,Tenant ID,Tenant Code\n' +
    filteredLogs.value.map(log => 
      `"${new Date(log.timestamp).toLocaleString()}","${log.action}","${log.subject}","${log.userId}","${log.userCode || ''}","${log.tenantId ?? ''}","${log.tenantCode || ''}"`
    ).join('\n')
  
  const element = document.createElement('a')
  element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv))
  element.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`)
  element.style.display = 'none'
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
}

const clearLogs = async () => {
  const clearLogsAsync = async () => {
    try {
      isLoading.value = true
      const response = await axios.delete(`${APIUrl}/activity-logs`, {
        headers: authHeaders()
      })
      showFeedback('Logs Cleared', `Logs cleared successfully (${response.data?.deleted || 0} removed).`)
      await loadActivityLogs()
      await loadSystemInfo()
    } catch (error: any) {
      console.error('Error clearing logs:', error)
      showFeedback('Clear Logs Failed', `Failed to clear logs: ${error.response?.data?.message || error.message}`, 'error')
    } finally {
      isLoading.value = false
    }
  }

  openConfirmModal(
    'Clear Activity Logs',
    'Are you sure? This action cannot be undone.',
    clearLogsAsync,
    'Clear Logs',
    'btn-delete',
  )
}

const restartServices = async () => {
  const restartServicesAsync = async () => {
    try {
      isLoading.value = true
      const response = await axios.put(`${APIUrl}/system-config/restart-services`, {}, {
        headers: authHeaders()
      })
      showFeedback('Restart Requested', response.data?.message || 'Restart request sent successfully.')
      await loadSystemInfo()
    } catch (error: any) {
      console.error('Error restarting services:', error)
      showFeedback('Restart Failed', `Failed to restart services: ${error.response?.data?.message || error.message}`, 'error')
    } finally {
      isLoading.value = false
    }
  }

  openConfirmModal(
    'Restart Services',
    'Restart all services now?',
    restartServicesAsync,
    'Restart',
    'btn-submit',
  )
}

const clearUserFilters = () => {
  userNameFilter.value = ''
  userEmailFilter.value = ''
  userRoleFilter.value = ''
  userStatusFilter.value = 'ACTIVE'
  userLastLoginFilter.value = ''
  userStationFilter.value = ''
  userTenantIdFilter.value = ''
  userTenantCodeFilter.value = ''
}

const clearTenantFilters = () => {
  tenantNameFilter.value = ''
  tenantCodeFilter.value = ''
  tenantDbModeFilter.value = ''
  tenantStatusFilter.value = ''
}

const clearStationFilters = () => {
  stationNameFilter.value = ''
  stationEmailFilter.value = ''
  stationPhoneFilter.value = ''
  stationCityFilter.value = ''
  stationTenantIdFilter.value = ''
  stationTenantCodeFilter.value = ''
  stationStatusFilter.value = ''
}

const clearLogFilters = async () => {
  logFilter.value = ''
  logLevel.value = ''
  logTenantIdFilter.value = ''
  logTenantCodeFilter.value = ''
  logSortBy.value = 'timestamp'
  logSortDir.value = 'desc'
  await loadActivityLogs()
}

const goBack = () => {
  if ((window as any).electronAPI?.returnToModules) {
    (window as any).electronAPI.returnToModules()
  } else {
    router.push('/modules')
  }
}
</script>

<style scoped>
.maintenance-container {
  width: 100vw;
  height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.drag-bar {
  width: 100%;
  -webkit-app-region: drag;
  display: flex;
  align-items: center;
  padding-left: 10px;
  z-index: 40;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  height: 42px;
}

.window-title {
  color: #333;
  font-size: 14px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  pointer-events: none;
  user-select: none;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  font-size: 20px;
  color: #666;
  cursor: pointer;
  transition: 0.15s;
  z-index: 60;
  -webkit-app-region: no-drag;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #000;
  background: #e0e0e0;
  border-radius: 4px;
}

.sort-header-btn {
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.sort-header-btn:hover {
  text-decoration: underline;
}

.access-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 42px);
  z-index: 1;
}

.denied-content {
  text-align: center;
  padding: 40px;
  background: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.denied-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.denied-content h2 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 24px;
}

.denied-content p {
  color: #666;
  margin: 8px 0;
  font-size: 14px;
}

.btn-back {
  margin-top: 20px;
  padding: 10px 20px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: 0.15s;
  -webkit-app-region: no-drag;
}

.btn-back:hover {
  background: #0052a3;
}

.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 42px);
  gap: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.maintenance-panel {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 42px);
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background: #f9f9f9;
  padding: 0;
  margin: 0;
  overflow-x: auto;
}

.tab-btn {
  padding: 12px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.15s;
  border-bottom: 2px solid transparent;
  -webkit-app-region: no-drag;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #333;
}

.tab-btn.active {
  color: #0066cc;
  border-bottom-color: #0066cc;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.tab-panel {
  max-width: 1000px;
  margin: 0 auto;
}

.tab-panel h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
}

.users-section,
.stations-section,
.tenants-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
}

.users-actions,
.stations-actions,
.tenants-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.config-form,
.add-user-form,
.edit-user-form,
.add-station-form,
.edit-station-form {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
  max-width: 500px;
}

.edit-user-form h4,
.edit-station-form h4 {
  margin: 0 0 14px 0;
  font-size: 15px;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

.form-group input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-start;
}

.btn-save,
.btn-submit,
.btn-add-user,
.btn-add-station,
.btn-export,
.btn-clear,
.btn-action {
  padding: 9px 16px;
  background: #0066cc;
  color: white;
  border: 1px solid #0066cc;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  min-height: 38px;
  transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
  -webkit-app-region: no-drag;
}

.btn-save:hover,
.btn-submit:hover,
.btn-add-user:hover,
.btn-add-station:hover,
.btn-export:hover,
.btn-action:hover {
  background: #0052a3;
  border-color: #0052a3;
  transform: translateY(-1px);
}

.btn-add-user,
.btn-add-station {
  min-width: 158px;
}

.btn-refresh {
  background: #ffffff;
  color: #1f2937;
  border-color: #cbd5e1;
  min-width: 120px;
}

.btn-refresh:hover {
  background: #f1f5f9;
  color: #111827;
  border-color: #94a3b8;
}

.btn-clear {
  background: #dc3545;
}

.btn-clear:hover {
  background: #c82333;
}

.btn-cancel {
  padding: 10px 16px;
  background: #e0e0e0;
  color: #333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: 0.15s;
  -webkit-app-region: no-drag;
}

.btn-cancel:hover {
  background: #d0d0d0;
}

.users-table,
.stations-table,
.tenants-table {
  background: #ffffff;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
}

.mono-value {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.user-groups {
  display: grid;
  gap: 16px;
}

.users-subsection h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
}

.table-pagination {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.page-btn {
  min-width: 34px;
  height: 34px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.page-btn:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
}

.page-btn.active {
  background: #0066cc;
  border-color: #0066cc;
  color: #ffffff;
}

.page-btn.page-nav {
  min-width: 40px;
}

.page-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.filters-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-input,
.filter-select {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  min-height: 38px;
}

.filter-input {
  min-width: 280px;
  flex: 1;
}

.filter-select {
  min-width: 160px;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #f0f0f0;
  padding: 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
}

td {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
  color: #666;
}

tr:hover {
  background: #f5f5f5;
}

.role-badge,
.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.role-badge.admin,
.status-badge.active {
  background: #d4edda;
  color: #155724;
}

.role-badge.it {
  background: #cfe2ff;
  color: #084298;
}

.role-badge.staff {
  background: #fff3cd;
  color: #856404;
}

.role-badge.fleet {
  background: #d1ecf1;
  color: #0c5460;
}

.role-badge.client {
  background: #e7d4f5;
  color: #5e4283;
}

.status-badge.inactive {
  background: #f8d7da;
  color: #721c24;
}

.btn-edit,
.btn-delete,
.btn-status {
  padding: 5px 9px;
  margin-right: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: 0.15s;
  -webkit-app-region: no-drag;
  white-space: nowrap;
}

.actions-cell {
  white-space: nowrap;
}

.action-buttons {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
}

.btn-edit {
  background: #0066cc;
  color: white;
}

.btn-edit:hover {
  background: #0052a3;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover {
  background: #c82333;
}

.btn-status {
  background: #0ea5e9;
  color: #ffffff;
}

.btn-status:hover {
  background: #0284c7;
}

.logs-section {
  background: #f9f9f9;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
}

.logs-actions {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.logs-filter {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.logs-filter input,
.logs-filter select {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.logs-filter input {
  flex: 1;
  min-width: 200px;
}

.logs-filter input:focus,
.logs-filter select:focus {
  outline: none;
  border-color: #0066cc;
}

.logs-buttons {
  display: flex;
  gap: 10px;
}

.logs-list {
  max-height: 400px;
  overflow-y: auto;
}

.log-entry {
  padding: 12px 15px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  display: flex;
  gap: 15px;
  align-items: center;
  background: white;
}

.log-entry:hover {
  background: #f5f5f5;
}

.log-time {
  color: #999;
  min-width: 180px;
  flex-shrink: 0;
}

.log-action {
  background: #cfe2ff;
  color: #084298;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
  min-width: 120px;
  flex-shrink: 0;
}

.log-subject {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.log-user {
  color: #666;
  min-width: 150px;
  text-align: right;
}

.system-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.info-card {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  text-align: center;
}

.info-label {
  color: #666;
  font-size: 13px;
  margin-bottom: 10px;
  font-weight: 500;
}

.info-value {
  color: #333;
  font-size: 28px;
  font-weight: 600;
}

.system-actions {
  display: flex;
  gap: 10px;
}

.empty-message {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-size: 14px;
}

.empty-message.compact {
  padding: 16px 12px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
  padding: 18px;
  -webkit-app-region: no-drag;
}

.modal-card {
  width: min(900px, 96vw);
  max-height: calc(100vh - 28px);
  overflow-y: auto;
  background: #ffffff;
  border-radius: 12px;
  padding: 18px 20px;
  border: 1px solid #d9e2ec;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
}

.modal-card.modal-compact {
  width: min(720px, 94vw);
}

.modal-card.modal-small {
  width: min(440px, 92vw);
  max-height: none;
  overflow: visible;
  padding: 16px 16px 14px;
}

.modal-card h4 {
  margin: 0 0 10px 0;
  font-size: 17px;
  color: #1f2937;
}

.modal-description {
  margin: 0 0 12px 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.45;
}

.modal-title-success {
  color: #166534 !important;
}

.modal-title-error {
  color: #991b1b !important;
}

.user-form-modal {
  width: min(1320px, 99vw);
  max-height: calc(100vh - 10px);
  padding: 12px 14px;
}

.user-form-modal h4 {
  margin-bottom: 8px;
  font-size: 16px;
}

.user-form-modal .section-title {
  margin: 6px 0 6px;
  padding-bottom: 3px;
  font-size: 11px;
}

.user-form-modal .form-grid-two {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 10px;
}

.user-form-modal .form-group {
  padding: 6px 8px;
}

.user-form-modal .form-group label {
  margin-bottom: 4px;
  font-size: 12px;
}

.user-form-modal .form-group input,
.user-form-modal .form-group select {
  min-height: 32px;
  padding: 6px 8px;
  font-size: 12px;
}

.user-form-modal .btn-toggle-password {
  height: 30px;
  min-width: 52px;
}

.user-form-modal .form-actions {
  margin-top: 6px;
}

.section-title {
  margin: 10px 0 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #edf2f7;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.45px;
}

.form-grid-two {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 12px;
}

.autocomplete-wrapper {
  position: relative;
}

.autocomplete-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 180px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  z-index: 250;
}

.autocomplete-item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  background: #ffffff;
  color: #1f2937;
  cursor: pointer;
  font-size: 13px;
}

.autocomplete-item:hover {
  background: #f3f4f6;
}

.autocomplete-empty {
  padding: 8px 10px;
  color: #6b7280;
  font-size: 13px;
  background: #ffffff;
}

.modal-card .form-group {
  margin-bottom: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
}

.modal-card .form-group label {
  margin-bottom: 6px;
}

.password-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.phone-plus {
  color: #334155;
  font-weight: 700;
  font-size: 14px;
  min-width: 10px;
}

.phone-code-input {
  width: 74px !important;
  min-width: 74px;
  text-align: center;
}

.phone-number-input {
  flex: 1;
}

.password-field input {
  flex: 1;
}

.btn-toggle-password {
  height: 34px;
  min-width: 56px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.btn-toggle-password:hover {
  background: #f1f5f9;
}

.modal-card .form-actions {
  justify-content: flex-end;
  margin-top: 8px;
}

.edit-status-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.form-error {
  margin: 6px 0 10px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
  font-size: 13px;
}

.form-success {
  margin: 6px 0 10px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  color: #166534;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .form-grid-two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .form-grid-two {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1180px) {
  .user-form-modal {
    width: min(1100px, 99vw);
  }

  .user-form-modal .form-grid-two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .user-form-modal {
    width: min(860px, 99vw);
  }

  .user-form-modal .form-grid-two {
    grid-template-columns: 1fr;
  }
}
</style>
