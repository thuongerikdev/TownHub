using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TH.Base.Domain.Entities
{
    [Table("buildings", Schema = "base")]
    public class Building
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }
        [Required, MaxLength(20)]
        public required string code { get; set; }
        [Required, MaxLength(200)]
        public required string name { get; set; }
        public int totalFloors { get; set; }
        public int totalUnits { get; set; }
        [MaxLength(200)]
        public string? managementCompany { get; set; }
    }

    [Table("floors", Schema = "base")]
    public class Floor
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }
        public Guid buildingId { get; set; }
        public int floorNumber { get; set; }
        [Required, MaxLength(50)]
        public required string floorName { get; set; }
        [MaxLength(30)]
        public string? floorType { get; set; }
    }

    [Table("units", Schema = "base")]
    public class Unit
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }
        public Guid floorId { get; set; }
        public Guid buildingId { get; set; }
        [Required, MaxLength(20)]
        public required string unitCode { get; set; }
        [Required, MaxLength(30)]
        public required string unitType { get; set; }
        [MaxLength(20)]
        public string status { get; set; } = "VACANT";
    }

    [Table("departments", Schema = "base")]
    public class Department
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid id { get; set; }
        public Guid buildingId { get; set; }
        [Required, MaxLength(20)]
        public required string code { get; set; }
        [Required, MaxLength(100)]
        public required string name { get; set; }
        public Guid? managerId { get; set; }
    }
}
