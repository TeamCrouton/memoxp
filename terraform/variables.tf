variable "resource_group_name" {
  type    = string
  default = "memoxp-resources-austria"
}

variable "location" {
  type        = string
  description = "Region Azure autorisee par Azure for Students (voir le guide, 3.6)"
  default     = "austriaeast"
}

variable "vm_size" {
  type        = string
  description = "4 Gio de RAM minimum pour K3s + PostgreSQL + l'API"
  default     = "Standard_B2als_v2"
}

variable "admin_username" {
  type    = string
  default = "memoxp"
}

variable "ssh_port" {
  type    = number
  default = 62205
}

variable "ssh_public_key_path" {
  type    = string
  default = "~/.ssh/id_rsa.pub"
}

variable "my_ip_cidr" {
  type        = string
  description = "Ton IP publique en /32 (ex. 81.240.12.34/32) : seule elle peut se connecter en SSH"

  validation {
    condition     = can(cidrhost(var.my_ip_cidr, 0))
    error_message = "my_ip_cidr doit etre une plage CIDR, par exemple 81.240.12.34/32."
  }
}
