create table account (
    userId int auto_increment primary key,
    joinDate DATETIME not null,
    username varchar(255) not null,
    password text not null,
    unique(username)
);

create table post (
    postId int not null auto_increment,
    username varchar(255) not null,
    message text not null,
    likes int default 0,
    primary key (postId)
);