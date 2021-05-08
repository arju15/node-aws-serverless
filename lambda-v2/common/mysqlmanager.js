var mysql = require("mysql2");
const moment = require('moment');
const dateFormat = "YYYY-MM-DD HH:mm:SS";


module.exports = class DBManager {
  async runQuery(sqlQry) {

    var connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    return new Promise((resolve, reject) => {
      connection.query(sqlQry,
        function (error, results, fields) {
          connection.close();
          if (error) reject(error);
          else resolve(results);
        }
      );
    });
  }

  async dataInsert(tableName, value) {

    value.date_created = moment().format(dateFormat);

    const fields = Object.keys(value)
      .map(key => `${key}`)
      .join(",");
    const values = Object.values(value)
      .map(value => {
        return typeof value === "string" ? `'${value}'` : `${value}`;
      })
      .join(",");

    var sqlQry = "INSERT INTO " + tableName + " (" + fields + ") values (" + values + ") ";

    return new Promise((resolve, reject) => {
      this.runQuery(sqlQry).then((data) => {
        resolve(data);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  async dataUpdate(tableName, dataObj, whereObj = {}, condition = "AND") {
    dataObj.date_modified = moment().format(dateFormat);

    const fieldsName = Object.keys(dataObj).map(function (key, index) {
      var value = typeof dataObj[key] === "string" ? `'${dataObj[key]}'` : `${dataObj[key]}`;
      return `${key} = ${value}`;
    }).join(",");

    const wheryQry = Object.keys(whereObj).map(function (key, index) {
      var value = typeof whereObj[key] === "string" ? `'${whereObj[key]}'` : `${whereObj[key]}`;
      return `${key} = ${value}`;
    }).join(" " + condition + " ");

    var sqlQry = "UPDATE " + tableName + " SET " + fieldsName;
    if (Object.keys(whereObj).length > 0) {
      sqlQry += " WHERE " + wheryQry;
    }

    return new Promise((resolve, reject) => {
      this.runQuery(sqlQry).then((data) => {
        resolve(data);
      }).catch((error) => {
        reject(error);
      });
    });
  }


  async getData(tableName, fieldsObj = "*", whereObj = {}, condition = "AND") {
    const wheryQry = Object.keys(whereObj).map(function (key, index) {
      var value = typeof whereObj[key] === "string" ? `'${whereObj[key]}'` : `${whereObj[key]}`;
      return `${key} = ${value}`;
    }).join(" " + condition + " ");

    var sqlQry = "SELECT " + fieldsObj + " FROM " + tableName;
    if (Object.keys(whereObj).length > 0) {
      sqlQry += " WHERE (" + wheryQry + ")";
      sqlQry += " AND is_deleted = 0";
    }
    else{
      sqlQry += " WHERE is_deleted = 0";
    }

    return new Promise((resolve, reject) => {
      this.runQuery(sqlQry).then((data) => {
        resolve(data);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  async dataDelete(tableName, whereObj = {}, condition = "AND") {
    const wheryQry = Object.keys(whereObj).map(function (key, index) {
      var value = typeof whereObj[key] === "string" ? `'${whereObj[key]}'` : `${whereObj[key]}`;
      return `${key} = ${value}`;
    }).join(" " + condition + " ");

    var sqlQry = "UPDATE " + tableName + " SET is_deleted = 1" ;
    if (Object.keys(whereObj).length > 0) {
      sqlQry += " WHERE " + wheryQry;
    }
    return new Promise((resolve, reject) => {
      this.runQuery(sqlQry).then((data) => {
        resolve(data);
      }).catch((error) => {
        reject(error);
      });
    });
  }
  
  async getJoinedData(tableName1, tableName2, table1ColumnName, table2ColumnName, fieldsObj = '*', whereObj = {}, condition = "AND") {
    const wheryQry = Object.keys(whereObj).map(function (key, index) {
      var value = typeof whereObj[key] === "string" ? `'${whereObj[key]}'` : `${whereObj[key]}`;
      return `${key} = ${value}`;
    }).join(" " + condition + " ");

    var sqlQry = "SELECT " + fieldsObj + " FROM " + tableName1 + " JOIN " + tableName2 + " ON " + `${tableName1}.${table1ColumnName}` + " = " + `${tableName2}.${table2ColumnName}`;
    if (Object.keys(whereObj).length > 0) {
      sqlQry += " WHERE (" + wheryQry + ")";
      sqlQry += ` AND ${tableName1}.is_deleted = 0`;
    }
    else{
      sqlQry += ` WHERE ${tableName1}.is_deleted = 0`;
    }
    console.log(sqlQry)
    return new Promise((resolve, reject) => {
      this.runQuery(sqlQry).then((data) => {
        resolve(data);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  async searchData(tableName, fieldsObj = '*', whereObj = {}, condition = "OR") {
    const whereQry = Object.keys(whereObj).map(function (key, index) {
      return `${key} LIKE  '%${whereObj[key]}%'`;
    }).join(" " + condition + " ");

    var sqlQry = "SELECT " + fieldsObj + " FROM " + tableName;
    if (Object.keys(whereObj).length > 0) {
      sqlQry += " WHERE (" + whereQry + ")";
      sqlQry += " AND is_deleted = 0";
    }
    else{
      sqlQry += " WHERE is_deleted = 0";
    }

    return new Promise((resolve, reject) => {
      this.runQuery(sqlQry).then((data) => {
        resolve(data);
      }).catch((error) => {
        reject(error);
      });
    });  
  }

  async getLimitData(tableName, fieldsObj = '*', offset, limit){
    var sqlQry = "SELECT " + fieldsObj + " FROM " + tableName + " LIMIT " + limit + " OFFSET " + offset ;
    console.log(sqlQry);
    return new Promise((resolve, reject) => {
      this.runQuery(sqlQry).then((data) => {
        resolve(data);
      }).catch((error) => {
        reject(error);
      });
    });
  }

  async countRecord(tableName){
    var sqlQry = "SELECT  COUNT(*) as total FROM " + tableName;
    return new Promise((resolve, reject) => {
      this.runQuery(sqlQry).then((data) => {
        resolve(data);
      }).catch((error) => {
        reject(error);
      });
    });
  }

};
