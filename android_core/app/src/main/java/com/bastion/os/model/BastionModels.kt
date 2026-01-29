
package com.bastion.os.model

/**
 * Represents the root Vault State structure serialized in the encrypted blob.
 */
data class VaultState(
    val entropy: String,          // 32-byte hex master seed
    val configs: List<VaultConfig> = emptyList(),
    val notes: List<Note> = emptyList(),
    val contacts: List<Contact> = emptyList(),
    val locker: List<Resonance> = emptyList(),
    val version: Int = 0,
    val lastModified: Long = 0
)

data class VaultConfig(
    val id: String,
    val name: String,
    val username: String,
    val version: Int,
    val length: Int,
    val useSymbols: Boolean,
    val category: String = "login",
    val updatedAt: Long
)

data class Note(
    val id: String,
    val title: String,
    val content: String,
    val updatedAt: Long
)

data class Contact(
    val id: String,
    val name: String,
    val email: String,
    val phone: String,
    val address: String,
    val notes: String,
    val updatedAt: Long
)

data class Resonance(
    val id: String,
    val label: String,
    val size: Long,
    val mime: String,
    val key: String, // Hex encoded
    val hash: String,
    val timestamp: Long
)
