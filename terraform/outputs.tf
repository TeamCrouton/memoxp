output "ip_publique" {
  value = azurerm_public_ip.public_ip.ip_address
}

output "commande_ssh" {
  value = "ssh -p ${var.ssh_port} ${var.admin_username}@${azurerm_public_ip.public_ip.ip_address}"
}
